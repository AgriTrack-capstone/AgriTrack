from PIL import Image, ImageOps
import os

root = os.path.dirname(os.path.dirname(__file__))
public = os.path.join(root, 'public')

test_path = os.path.join(root, 'test.jpg')
login_bg_path = os.path.join(public, 'login-bg.jpg')

out1 = os.path.join(public, 'test-composite-login-bg.png')
out2 = os.path.join(public, 'test-solid-f6f7f4.png')

# load images
if not os.path.exists(test_path):
    raise SystemExit('test.jpg not found')
if not os.path.exists(login_bg_path):
    raise SystemExit('public/login-bg.jpg not found')

test = Image.open(test_path).convert('RGBA')
login_bg = Image.open(login_bg_path).convert('RGBA')

# resize test to match login_bg
test_resized = ImageOps.fit(test, login_bg.size, method=Image.LANCZOS)

# create composite: blend test over login_bg with low opacity
alpha = 0.15
composite = Image.blend(login_bg, test_resized, alpha)
composite.save(out1)
print('Saved', out1)

# create solid color background
solid = Image.new('RGBA', login_bg.size, (246,247,244,255))
solid_blend = Image.blend(solid, test_resized, alpha)
solid_blend.save(out2)
print('Saved', out2)
