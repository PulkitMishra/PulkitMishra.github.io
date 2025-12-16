# Portfolio

## Quick Start

```bash
# Clone the repository
git clone https://github.com/PulkitMishra/portfolio
cd portfolio

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see your site with hot reload.

## Development Workflow

### Adding New Projects

1. Add project entry to `config/site.json`:
```json
{
  "slug": "my-new-project",
  "title": "My New Project",
  "description": "Brief description...",
  "featured": true,
  "tags": ["Tag1", "Tag2"]
}
```

2. Create content file `content/projects/my-new-project.md`:
```markdown
# My New Project

## Overview
Project description here...

## Technical Implementation
- Technology 1
- Technology 2

## Results
Key outcomes and metrics...
```

3. Rebuild: `npm run build`

### Available Scripts

```bash
npm run dev          # Development server with hot reload
npm run build        # Production build
npm run build:prod   # Production build with all optimizations  
npm run test         # Run site validation tests
npm run lighthouse   # Performance audit
npm run deploy       # Deploy to GitHub Pages
npm run serve        # Serve production build locally
```

## File Structure

```
portfolio/
├── templates/           # HTML templates
├── assets/             # CSS, JS, images
│   ├── css/           # Theme variables, base styles, components
│   ├── js/            # Main JavaScript functionality
│   └── images/        # Optimized images
├── content/           # Markdown content files
├── config/            # Site configuration
├── scripts/           # Build and deployment scripts
├── dist/              # Generated site (auto-created)
└── build.js          # Production build system
```


## Deployment

### GitHub Pages (Recommended)

1. Push to GitHub repository
2. Enable GitHub Actions in repository settings
3. Set Pages source to "GitHub Actions"
4. Automatic deployment on every push to main

### Manual Deployment

```bash
npm run deploy
```

## Customization

### Modifying Themes
Edit `assets/css/themes.css` to adjust:
- Color variables
- Background patterns  
- Animation parameters

### Adding Content
- Projects: Add to `config/site.json` + create markdown file
- Blog posts: Same process in blog section
- Images: Place in `assets/images/` for automatic optimization

## Performance Reports

Run `npm run lighthouse` to generate detailed performance reports.

## Support

If you encounter issues:
1. Check the build logs for errors
2. Verify all dependencies are installed
3. Ensure Node.js version 16+ is installed
4. Run `npm run test` to validate the build

