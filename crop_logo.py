from PIL import Image
import math

img = Image.open('apps/web/public/logo-innovation.jpg').convert('RGBA')
width, height = img.size

# The logo is a circle in the center. We want to find the radius of the dark circle.
# Let's just create a new image that tightly crops the center 80% (approx) and makes the rest transparent.
# Let's inspect the center row to find the left and right edges of the dark circle.
pixels = img.load()
cy = height // 2

left_edge = 0
for x in range(width):
    r, g, b, a = pixels[x, cy]
    # Dark color of the logo edge
    if r < 100 and g < 100 and b < 150: # Adjust thresholds based on the dark navy blue
        left_edge = x
        break

right_edge = width - 1
for x in range(width - 1, -1, -1):
    r, g, b, a = pixels[x, cy]
    if r < 100 and g < 100 and b < 150:
        right_edge = x
        break

if left_edge < right_edge:
    diameter = right_edge - left_edge
    radius = diameter / 2.0
    cx = (left_edge + right_edge) / 2.0
    
    # Create an alpha mask
    mask = Image.new('L', (width, height), 0)
    import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)
    
    img.putalpha(mask)
    
    # Crop to the bounding box
    bbox = (int(cx - radius), int(cy - radius), int(cx + radius), int(cy + radius))
    cropped = img.crop(bbox)
    
    cropped.save('apps/web/public/logo-innovation.png', 'PNG')
    print('Cropped successfully. Left:', left_edge, 'Right:', right_edge)
else:
    print('Failed to find edges')
