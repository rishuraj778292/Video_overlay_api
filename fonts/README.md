# Fonts Directory

Place your custom font files (.ttf, .otf) in this directory.

## How to use custom fonts:

1. **Add font file**: Copy your .ttf or .otf font file to this directory
2. **Reference in API**: Use the full path in the `fontFile` parameter
3. **Example**: If you have `MyFont.ttf` in this folder, use `./fonts/MyFont.ttf`

## Supported formats:
- `.ttf` (TrueType Font)
- `.otf` (OpenType Font)

## Example fonts you can download:
- **Roboto**: https://fonts.google.com/specimen/Roboto
- **Open Sans**: https://fonts.google.com/specimen/Open+Sans
- **Lato**: https://fonts.google.com/specimen/Lato
- **Montserrat**: https://fonts.google.com/specimen/Montserrat

## Usage in API:
```json
{
  "videoUrl": "https://drive.google.com/file/d/YOUR_ID/view",
  "text": "Your Text Here",
  "fontFile": "./fonts/YourFont.ttf",
  "fontSize": 32,
  "fontColor": "black"
}
```
