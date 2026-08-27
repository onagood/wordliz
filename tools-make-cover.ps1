# Draws store/cover.png — the tile wordmark over three rows parked at different
# offsets, which is what the board looks like mid-move. 1260x1000, twice itch's
# recommended 630x500, so it stays sharp wherever the page scales it.
#
#   powershell -File tools-make-cover.ps1 -Ttf <path to Rubik[wght].ttf>
#
# The repo ships Rubik as woff2 for the browser; GDI+ needs TrueType, so fetch
# https://github.com/google/fonts/raw/main/ofl/rubik/Rubik%5Bwght%5D.ttf
# (SIL OFL, same font, see THIRD-PARTY.md) and point -Ttf at it.
param([Parameter(Mandatory=$true)][string]$Ttf)
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot 'store\cover.png'

$pfc = New-Object System.Drawing.Text.PrivateFontCollection
$pfc.AddFontFile($Ttf)
$script:fam = $pfc.Families[0]

function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
$LINEN = C '#F8F2E4'; $TILE = C '#FFFDF4'; $TILE_BASE = C '#DACBA5'
$HIT = C '#3E7C5F'; $HIT_DEEP = C '#2A5A43'; $HIT_INK = C '#F6F9F0'
$WARM = C '#F2C14E'; $WARM_DEEP = C '#B07E14'; $WARM_INK = C '#5C3E00'
$ACC = C '#CE4B41'; $ACC_DEEP = C '#93291F'; $ACC_INK = C '#FFF0EC'
$INK = C '#3E2F1F'

$W = 1260; $H = 1000
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$script:g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.Clear($LINEN)

function RoundRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# one board tile: a darker slab with the face stopping short of its bottom edge
function Tile([single]$x, [single]$y, [single]$size, $face, $deep, $ink, [string]$letter, [single]$rot) {
  $lip = $size * 0.10
  $state = $script:g.Save()
  if ($rot -ne 0) {
    $script:g.TranslateTransform($x + $size / 2, $y + $size / 2)
    $script:g.RotateTransform($rot)
    $script:g.TranslateTransform(-($x + $size / 2), -($y + $size / 2))
  }
  $r = $size * 0.19
  $p1 = RoundRect $x $y $size $size $r
  $p2 = RoundRect $x $y $size ($size - $lip) $r
  $b1 = New-Object System.Drawing.SolidBrush($deep)
  $b2 = New-Object System.Drawing.SolidBrush($face)
  $script:g.FillPath($b1, $p1)
  $script:g.FillPath($b2, $p2)

  $fnt = New-Object System.Drawing.Font($script:fam, [single]($size * 0.44), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $bi = New-Object System.Drawing.SolidBrush($ink)
  $rect = New-Object System.Drawing.RectangleF($x, $y, $size, ($size - $lip))
  $script:g.DrawString($letter, $fnt, $bi, $rect, $sf)

  $b1.Dispose(); $b2.Dispose(); $bi.Dispose(); $fnt.Dispose(); $sf.Dispose(); $p1.Dispose(); $p2.Dispose()
  $script:g.Restore($state)
}

# --- the wordmark, every other letter coloured like the logo in the game ---
$letters = @('W', 'O', 'R', 'D', 'L', 'I', 'Z')
$accent = @{ 1 = @($HIT, $HIT_DEEP, $HIT_INK); 3 = @($WARM, $WARM_DEEP, $WARM_INK); 5 = @($ACC, $ACC_DEEP, $ACC_INK) }
$rots = @{ 1 = -3; 2 = 2; 4 = -2; 6 = 3 }
$ts = 132; $gap = 14
$tot = $letters.Count * $ts + ($letters.Count - 1) * $gap
$x0 = ($W - $tot) / 2
for ($i = 0; $i -lt $letters.Count; $i++) {
  $f = $TILE; $d = $TILE_BASE; $k = $INK
  if ($accent.ContainsKey($i)) { $a = $accent[$i]; $f = $a[0]; $d = $a[1]; $k = $a[2] }
  $rot = 0; if ($rots.ContainsKey($i)) { $rot = $rots[$i] }
  Tile ($x0 + $i * ($ts + $gap)) 105 $ts $f $d $k ($letters[$i]) $rot
}

# --- three rows, each at its own offset: the lines move independently ---
$rows = @(
  @{ w = 'SLIDE'; face = $HIT;  deep = $HIT_DEEP;  ink = $HIT_INK;  dx = 62 },
  @{ w = 'WORDS'; face = $WARM; deep = $WARM_DEEP; ink = $WARM_INK; dx = -52 },
  @{ w = 'APART'; face = $TILE; deep = $TILE_BASE; ink = $INK;      dx = 18 }
)
$bs = 152; $bgap = 16
$bx = ($W - (5 * $bs + 4 * $bgap)) / 2
for ($r = 0; $r -lt $rows.Count; $r++) {
  $row = $rows[$r]
  $chars = $row.w.ToCharArray()
  for ($i = 0; $i -lt $chars.Count; $i++) {
    $ch = [string]($chars[$i])
    Tile ($bx + $row.dx + $i * ($bs + $bgap)) (395 + $r * ($bs + 22)) $bs $row.face $row.deep $row.ink $ch 0
  }
}

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output ("written: $out  " + [math]::Round((Get-Item $out).Length / 1KB, 1) + " KB")
