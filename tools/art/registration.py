"""Place an unmodified source on its measured master canvas before runtime encoding.

registration.matrix maps output/master pixels to input/source pixels (Pillow affine order).
It corrects placement only; it cannot repair missing wheels, perspective or painted defects.
"""
from PIL import Image


def registered_image(image, entry):
    registration = entry.get('registration')
    if not registration:
        return image
    size = tuple(registration['canvas'])
    matrix = tuple(registration['matrix'])
    if len(size) != 2 or min(size) <= 0 or len(matrix) != 6:
        raise ValueError('invalid artwork registration')
    return image.convert('RGBA').transform(
        size, Image.Transform.AFFINE, matrix, Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0, 0))
