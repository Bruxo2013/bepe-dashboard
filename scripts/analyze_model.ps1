$w = New-Object -ComObject Word.Application
$w.Visible = $false

$modelPath = 'C:\Users\levyg\OneDrive\Desktop\BEPE P1\PMERJ - BEPE - P1\ATUALIZAÇÔES BEPE PRAÇAS 2025\101.624 CB ALMEIDA - ATUALIZADO\101.624 3 SGT ALMEIDA - 2º SEMESTRE 2018.doc'
$doc = $w.Documents.Open($modelPath)

Write-Host '=== PAGE SETUP ==='
$sec = $doc.Sections.Item(1)
$psetup = $sec.PageSetup
Write-Host "PageWidth=$($psetup.PageWidth) PageHeight=$($psetup.PageHeight)"
Write-Host "TopMargin=$($psetup.TopMargin) BottomMargin=$($psetup.BottomMargin)"
Write-Host "LeftMargin=$($psetup.LeftMargin) RightMargin=$($psetup.RightMargin)"
Write-Host "HeaderDistance=$($psetup.HeaderDistance) FooterDistance=$($psetup.FooterDistance)"

Write-Host ''
Write-Host '=== PAGE BORDERS ==='
foreach ($edge in @(1,2,3,4)) {
    try {
        $b = $sec.Borders.Item($edge)
        Write-Host "Border $edge`: LineStyle=$($b.LineStyle) LineWidth=$($b.LineWidth) Color=$($b.Color) DistFromText=$($b.DistanceFromText)"
    } catch { Write-Host "Border $edge`: none" }
}

Write-Host ''
Write-Host '=== HEADER CONTENT ==='
$hdr = $sec.Headers.Item(1)
Write-Host "Header paragraphs: $($hdr.Range.Paragraphs.Count)"
for ($i = 1; $i -le $hdr.Range.Paragraphs.Count; $i++) {
    $para = $hdr.Range.Paragraphs.Item($i)
    $txt = $para.Range.Text.TrimEnd([char]13)
    $fnt = $para.Range.Font
    Write-Host "  H-P$i`: [$txt] Font=$($fnt.Name) Size=$($fnt.Size) Bold=$($fnt.Bold) Align=$($para.Alignment)"
    Write-Host "    LineSpacing=$($para.LineSpacing) SpaceBefore=$($para.SpaceBefore) SpaceAfter=$($para.SpaceAfter)"
}
try {
    $inlines = $hdr.Range.InlineShapes
    Write-Host "Header inline shapes: $($inlines.Count)"
    for ($i = 1; $i -le $inlines.Count; $i++) {
        $sh = $inlines.Item($i)
        Write-Host "  InlineShape $i`: Type=$($sh.Type) W=$($sh.Width) H=$($sh.Height)"
    }
} catch {}

Write-Host ''
Write-Host '=== BODY PARAGRAPHS ==='
$totalParas = $doc.Content.Paragraphs.Count
Write-Host "Total paragraphs: $totalParas"
for ($i = 1; $i -le [Math]::Min($totalParas, 60); $i++) {
    $para = $doc.Content.Paragraphs.Item($i)
    $txt = $para.Range.Text.TrimEnd([char]13)
    $fnt = $para.Range.Font
    $displayTxt = if ($txt.Length -gt 80) { $txt.Substring(0,80) + '...' } else { $txt }
    Write-Host "P$i`: [$displayTxt]"
    Write-Host "  Font=$($fnt.Name) Size=$($fnt.Size) Bold=$($fnt.Bold) Align=$($para.Alignment) LineSpacing=$($para.LineSpacing) SpBefore=$($para.SpaceBefore) SpAfter=$($para.SpaceAfter)"

    # Check runs within paragraph for mixed formatting
    $runs = $para.Range.Words
    if ($runs.Count -le 8 -and $txt.Length -gt 0) {
        for ($r = 1; $r -le $runs.Count; $r++) {
            $run = $runs.Item($r)
            $rtxt = $run.Text.TrimEnd([char]13)
            if ($rtxt.Trim().Length -gt 0) {
                Write-Host "    Run$r`: [$rtxt] Font=$($run.Font.Name) Size=$($run.Font.Size) Bold=$($run.Font.Bold)"
            }
        }
    }
}

Write-Host ''
Write-Host '=== DOCUMENT SHAPES (Text Boxes) ==='
Write-Host "Total shapes: $($doc.Shapes.Count)"
for ($i = 1; $i -le $doc.Shapes.Count; $i++) {
    $sh = $doc.Shapes.Item($i)
    Write-Host "Shape $i`: Name=$($sh.Name) Type=$($sh.Type) AutoShapeType=$($sh.AutoShapeType)"
    Write-Host "  Left=$($sh.Left) Top=$($sh.Top) Width=$($sh.Width) Height=$($sh.Height)"
    try {
        $tf = $sh.TextFrame
        if ($tf.HasText) {
            $stxt = $tf.TextRange.Text.TrimEnd([char]13)
            $sfnt = $tf.TextRange.Font
            Write-Host "  Text=[$stxt] Font=$($sfnt.Name) Size=$($sfnt.Size) Bold=$($sfnt.Bold)"
        }
    } catch {}
}

Write-Host ''
Write-Host '=== TABLES ==='
Write-Host "Total tables: $($doc.Tables.Count)"

$doc.Close([ref]$false)
$w.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
