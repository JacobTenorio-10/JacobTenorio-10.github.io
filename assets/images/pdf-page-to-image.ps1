param(
    [Parameter(Mandatory=$true)][string]$PdfPath,
    [Parameter(Mandatory=$true)][int]$PageNumber,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [int]$Width = 900,
    [int]$JpegQuality = 85
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
})[0]

function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}
function AwaitAction($WinRtAction) {
    $netTask = $asTaskAction.Invoke($null, @($WinRtAction))
    $netTask.Wait(-1) | Out-Null
}

[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime] | Out-Null

$resolvedPdfPath = (Resolve-Path $PdfPath).Path
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resolvedPdfPath)) ([Windows.Storage.StorageFile])
$pdfDoc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])

$pageIndex = $PageNumber - 1
if ($pageIndex -lt 0 -or $pageIndex -ge $pdfDoc.PageCount) {
    throw "Page $PageNumber out of range (document has $($pdfDoc.PageCount) pages)"
}

$page = $pdfDoc.GetPage([uint32]$pageIndex)

$stream = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
$renderOptions = New-Object Windows.Data.Pdf.PdfPageRenderOptions
$renderOptions.DestinationWidth = [uint32]([math]::Max($Width * 2, 1800))
AwaitAction ($page.RenderToStreamAsync($stream, $renderOptions))
$page.Dispose()

$netStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream.GetInputStreamAt(0))
$bitmap = [System.Drawing.Bitmap]::FromStream($netStream)

$newHeight = [int]([double]$bitmap.Height * $Width / $bitmap.Width)
$resized = New-Object System.Drawing.Bitmap($bitmap, $Width, $newHeight)
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($bitmap, 0, 0, $Width, $newHeight)

$parentDir = Split-Path -Parent $OutputPath
if ($parentDir -and -not (Test-Path $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }

$ext = [System.IO.Path]::GetExtension($OutputPath).ToLower()
if ($ext -eq '.png') {
    $resized.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} else {
    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$JpegQuality)
    $resized.Save($OutputPath, $jpegCodec, $encParams)
}

$graphics.Dispose(); $resized.Dispose(); $bitmap.Dispose(); $netStream.Dispose(); $stream.Dispose()
Write-Host "Saved page $PageNumber of '$resolvedPdfPath' -> '$OutputPath' ($Width x $newHeight)"
