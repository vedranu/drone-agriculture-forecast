param([string]$docx)
$pdf = [IO.Path]::ChangeExtension($docx, '.pdf')
$w = New-Object -ComObject Word.Application; $w.Visible = $false; $w.DisplayAlerts = 0
$d = $w.Documents.Open($docx, $false, $true)
$pages = $d.ComputeStatistics(2)   # wdStatisticPages
$d.ExportAsFixedFormat($pdf, 17)   # wdExportFormatPDF
$d.Close($false); $w.Quit()
"Pages: $pages"
"PDF: $pdf"
