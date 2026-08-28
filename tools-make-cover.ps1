# Draws the store covers — the tile wordmark over three rows parked at different
# offsets, which is what the board looks like mid-move.
#
#   powershell -File tools-make-cover.ps1 -Ttf <path to Rubik[wght].ttf>
#
# Output (store/):
#   cover.png            1260x1000 — itch, twice its recommended 630x500
#   cover-landscape.png  1920x1080 — CrazyGames 16:9
#   cover-portrait.png    800x1200 — CrazyGames 2:3
#   cover-square.png       800x800 — CrazyGames 1:1
#
# The artwork is drawn once in its own 1260x1000 coordinate space; every other
# size is the same drawing scaled to fit and centred, so the three CrazyGames
# covers cannot drift away from the itch one.
#
# The repo ships Rubik as woff2 for the browser; GDI+ needs TrueType, so fetch
# https://github.com/google/fonts/raw/main/ofl/rubik/Rubik%5Bwght%5D.ttf
# (SIL OFL, same font, see THIRD-PARTY.md) and point -Ttf at it.
param([Parameter(Mandatory=$true)][string]$Ttf)
Add-Type -AssemblyName System.Drawing

$pfc = New-Object System.Drawing.Text.PrivateFontCollection
$pfc.AddFontFile($Ttf)
$script:fam = $pfc.Families[0]

function C([string]$hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
$LINEN = C '#F8F2E4'; $TILE = C '#FFFDF4'; $TILE_BASE = C '#DACBA5'
$HIT = C '#3E7C5F'; $HIT_DEEP = C '#2A5A43'; $HIT_INK = C '#F6F9F0'
$WARM = C '#F2C14E'; $WARM_DEEP = C '#B07E14'; $WARM_INK = C '#5C3E00'
$ACC = C '#CE4B41'; $ACC_DEEP = C '#93291F'; $ACC_INK = C '#FFF0EC'
$INK = C '#3E2F1F'

# the coordinate space the artwork is drawn in, and the box it actually fills.
# The box is what gets fitted — fitting the whole canvas would carry its dead
# margins into every other aspect ratio.
$W = 1260; $H = 1000
$BOX_X = 126; $BOX_Y = 105; $BOX_W = 1008; $BOX_H = 803

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

function Draw-Artwork {
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

  # --- three rows, each parked at its own offset. Read down, the first two spell
  #     WORDPLAY and the third says how it moves; the offsets are what say the
  #     lines slide independently. ---
  $rows = @(
    @{ w = 'WORD'; face = $HIT;  deep = $HIT_DEEP;  ink = $HIT_INK;  dx = 46 },
    @{ w = 'PLAY'; face = $WARM; deep = $WARM_DEEP; ink = $WARM_INK; dx = -54 },
    @{ w = 'SLIP'; face = $TILE; deep = $TILE_BASE; ink = $INK;      dx = 14 }
  )
  $bs = 172; $bgap = 16
  $wordX = ($W - (4 * $bs + 3 * $bgap)) / 2
  for ($r = 0; $r -lt $rows.Count; $r++) {
    $row = $rows[$r]
    $chars = $row.w.ToCharArray()
    $y = 352 + $r * ($bs + 20)
    for ($i = 0; $i -lt $chars.Count; $i++) {
      Tile ($wordX + $row.dx + $i * ($bs + $bgap)) $y $bs $row.face $row.deep $row.ink ([string]$chars[$i]) 0
    }
  }
}

# fill is how much of the shorter dimension the artwork is allowed to take —
# the wider the canvas next to the artwork, the more air it wants.
# dy nudges the artwork down as a fraction of canvas height: CrazyGames stamps
# its own labels over the top-left corner of a cover, and centred artwork puts
# the wordmark right under them, so the two landscape-ish sizes duck below.
$targets = @(
  @{ file = 'cover.png';           w = 1260; h = 1000; fill = $null; dy = 0 },
  @{ file = 'cover-landscape.png'; w = 1920; h = 1080; fill = 0.72; dy = 0.10 },
  @{ file = 'cover-portrait.png';  w =  800; h = 1200; fill = 0.94; dy = 0 },
  @{ file = 'cover-square.png';    w =  800; h =  800; fill = 0.74; dy = 0.14 }
)

foreach ($t in $targets) {
  $out = Join-Path $PSScriptRoot ('store\' + $t.file)
  $bmp = New-Object System.Drawing.Bitmap($t.w, $t.h)
  $script:g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear($LINEN)

  # a null fill means native size: draw untransformed, so the itch cover comes
  # out byte-for-byte what it was before the other sizes existed
  if ($null -ne $t.fill) {
    $s = [math]::Min($t.w * $t.fill / $BOX_W, $t.h * $t.fill / $BOX_H)
    $g.TranslateTransform(
      [single]($t.w / 2 - ($BOX_X + $BOX_W / 2) * $s),
      [single]($t.h / 2 - ($BOX_Y + $BOX_H / 2) * $s + $t.h * $t.dy))
    $g.ScaleTransform([single]$s, [single]$s)
  }

  Draw-Artwork

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("written: store\" + $t.file + "  " + $t.w + "x" + $t.h + "  " +
    [math]::Round((Get-Item $out).Length / 1KB, 1) + " KB")
}
