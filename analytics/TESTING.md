# TOON Analytics Dashboard Testing Guide

**Note:** Always navigate to `toon\analytics` directory first before running any commands.

## Prerequisites

Ensure you have Node.js and npm installed on your system.

## Testing Steps

### Step 1: Navigate to Analytics Directory

```bash
cd c:\git-ai\toon\analytics
```

### Step 2: Start Backend Server

```bash
npx tsx server/index.ts
```

**Expected output:**

```text
Analytics dashboard: http://localhost:1234
```

### Step 3: Start Frontend Dashboard (New Terminal)

```bash
cd c:\git-ai\toon\analytics
npx vite
```

**Expected output:**

```text
VITE ready in XXXXms
Local: http://localhost:1234/
```

### Step 4: Open Dashboard in Browser

Navigate to: `http://localhost:1234`

### Step 5: Generate Test Data (New Terminal)

```bash
cd c:\git-ai\toon\analytics
npx tsx enhanced-monitor.ts --test --interval 2000
```

**Expected output:**

```text
Enhanced TOON Monitor (Testing Mode)
Target: localhost:1234 | Interval: 2000ms
Press Ctrl+C to stop
```

## Validation Checklist

- [ ] Dashboard loads without errors
- [ ] Connection status shows "Live (WebSocket)"
- [ ] Real-time metrics display compression ratios, speeds, memory usage
- [ ] Charts update every 2 seconds with new data points
- [ ] Compression ratios between 2x to 3x
- [ ] Interactive charts show historical trends
- [ ] No console errors in browser developer tools

## Expected Results

- **GitHub Repos**: ~2.0x compression
- **User Analytics**: ~2.1x compression
- **API Metrics**: ~2.3x compression
- **Time Series**: ~2.9x compression

## Stopping the Test

Press `Ctrl+C` in all three terminal windows to stop:

1. Backend server
2. Frontend dashboard
3. Test data generator

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server fails to start | Check port 3001 is available |
| Dashboard is blank | Verify WebSocket connection at `/ws` |
| No data updating | Ensure monitor is sending to correct port |
| Test failures | Check console for detailed error messages |
| Port conflicts | Kill existing processes: `taskkill /F /IM node.exe` |
| EADDRINUSE error on port 1234 | Kill existing processes: `taskkill /F /IM node.exe /IM tsx.exe` then retry |

## API Endpoints for Manual Testing

- `GET /api/health` Server health check
- `GET /api/metrics` Current metrics snapshot
- `GET /api/history?minutes=60` Historical data
- `WS /ws` WebSocket for real-time updates
