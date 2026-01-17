# Run server locally
python -m http.server 8000 --directory src

# Deployment Guide

## Files to Upload

Upload these files/folders to your web server root:

```
/
├── index.html          (main entry point)
├── favicon.svg         (site icon)
├── .htaccess          (Apache config - optional for non-Apache servers)
└── src/
    ├── main.js
    ├── styles.css
    ├── data/
    │   └── parking-data.json
    ├── lib/
    │   ├── data-loader.js
    │   ├── statistics.js
    │   └── time-utils.js
    └── ui/
        ├── chart.js
        └── controls.js
```

## Do NOT Upload

- `.claude/` - Development files
- `.specify/` - Specification files
- `specs/` - Design documentation
- `tests/` - Test files
- `src/index.html` - Duplicate (use root index.html)
- `DEPLOY.md` - This file

## Server Requirements

- **Any HTTP server** (Apache, Nginx, IIS, etc.)
- **No server-side processing** required (static files only)
- **CORS not required** (all assets are same-origin)

## Apache Configuration

The `.htaccess` file provides:
- GZIP compression
- Browser caching
- Security headers
- MIME type configuration

For **Nginx**, add to your server block:
```nginx
gzip on;
gzip_types text/html text/css application/javascript application/json image/svg+xml;

location ~* \.(js|css|json|svg)$ {
    expires 1w;
}
```

## Quick Deploy Commands

### Using FTP/SFTP
Upload the files listed above to your web root.

### Using rsync
```bash
rsync -avz --exclude='.claude' --exclude='.specify' --exclude='specs' --exclude='tests' --exclude='DEPLOY.md' --exclude='src/index.html' ./ user@server:/var/www/html/
```

### Using SCP
```bash
scp -r index.html favicon.svg .htaccess src/ user@server:/var/www/html/
```

## Verification

After deployment, open your site URL. You should see:
1. Control panel on the left with all filter options
2. Chart area on the right displaying parking occupancy data
3. Default view: Last 7 days, daily aggregation, line chart

If the chart doesn't load, check:
1. Browser console for JavaScript errors
2. Network tab to ensure `parking-data.json` loads (should be ~4.6 MB)
3. Verify all JS files are accessible (check for 404 errors)

## File Sizes

| File | Size |
|------|------|
| parking-data.json | ~4.6 MB |
| All other files | < 100 KB total |
| ECharts (CDN) | ~1 MB (loaded from jsdelivr) |

Total upload size: **~4.7 MB**
