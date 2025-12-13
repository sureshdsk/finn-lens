# FinnLens

Your year in payments, privacy-first. A 100% offline web application that analyzes your Google Pay transaction history and creates personalized insights in a Spotify Wrapped-style story format.

## Features

- **100% Private & Offline**: All data processing happens in your browser. Your financial data never leaves your device.
- **Interactive Story Mode**: Swipe through 8-10 personalized insights about your spending habits
- **Year Filtering**: View insights for specific years or all-time data
- **Social Sharing**: Export beautiful 1080x1080 images for Instagram, Story format, and Twitter
- **Real-time Processing**: Upload your Google Takeout export and get insights in seconds
- **Zero Tracking**: No analytics, no cookies, no external network calls

## Privacy Guarantees

- All data processing happens client-side in your browser
- No data is sent to any server
- Data is stored temporarily in sessionStorage and cleared when you close the tab
- No tracking, analytics, or third-party scripts
- Open source - you can audit the code yourself

## How to Use

### 1. Export Your Google Pay Data

1. Go to [Google Takeout](https://takeout.google.com/)
2. Click "Deselect all"
3. Scroll down and select only "Google Pay"
4. Click "Next step" → "Create export"
5. Wait for the export email (usually within minutes)
6. Download the `.zip` file

### 2. Upload to FinnLens

1. Visit the FinnLens app
2. Drag and drop your downloaded `.zip` file, or click to browse
3. Wait a few seconds for processing
4. Browse your personalized insights!

### 3. Share Your Story

- Swipe through insights using arrow keys, navigation buttons, or touch gestures
- Click the share button to export any insight as an image
- Choose from multiple formats: Instagram Post (1080x1080), Story (1080x1920), or Twitter (1200x675)

## Insights Provided

FinnLens analyzes your data to provide insights like:

- **Domain Collector**: Track your domain purchases and renewals
- **Group Expense Champion**: See your reliability in paying group bills
- **Voucher Hoarder**: Find out how many vouchers you let expire
- **Spending Timeline**: Your complete payment history timeline
- **Split Partner**: Your most frequent bill-splitting friend
- **Reward Hunter**: Total cashback and rewards earned
- **Expensive Day**: Your biggest spending day on record
- **Responsible One**: How many group expenses you organized
- **Money Network**: Your payment social circle

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Zustand** for state management
- **JSZip** for processing Google Takeout files
- **PapaParse** for CSV parsing
- **html2canvas** for image generation
- **React Router** for navigation
- **Tailwind CSS** for styling

## Development

### Prerequisites

- Node.js 18+ and npm
- Git

### Getting Started

```bash
# Clone the repository
git clone git@github.com:sureshdsk/gpay-wrapped.git
OR
git clone https://github.com/sureshdsk/gpay-wrapped.git
cd finnlens

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Type check and lint
npm run lint

# Run tests
npm test                # Run tests in watch mode
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage report

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Development Workflow

1. **Clone and Install**: Clone the repository and run `npm install`
2. **Start Dev Server**: Run `npm run dev` to start the development server
3. **Make Changes**: Edit files in the `src/` directory
4. **Test Locally**: Upload a Google Pay Takeout export to test your changes
5. **Build**: Run `npm run build` to create a production build
6. **Preview**: Run `npm run preview` to test the production build locally

### Project Structure

```
src/
├── components/
│   ├── upload/          # File upload components
│   └── story/           # Story mode components
├── pages/
│   ├── Landing.tsx      # Upload page
│   ├── Processing.tsx   # Loading/processing page
│   └── Story.tsx        # Main story display
├── stores/
│   └── dataStore.ts     # Zustand state management
├── types/
│   ├── data.types.ts    # Data structure types
│   ├── insight.types.ts # Insight types
│   ├── storage.types.ts # Storage types
│   └── export.types.ts  # Export types
├── utils/
│   ├── zipParser.ts     # ZIP file extraction
│   ├── csvParser.ts     # CSV parsing
│   ├── jsonParser.ts    # JSON parsing
│   └── currencyUtils.ts # Currency handling
└── App.tsx              # Root component
```

## Data Format

FinnLens processes the following files from your Google Takeout export:

- `Google transactions/transactions_*.csv` - Transaction history
- `Google Pay/Group expenses/Group expenses.json` - Split bills
- `Google Pay/Rewards earned/Cashback rewards.csv` - Cashback history
- `Google Pay/Rewards earned/Voucher rewards.json` - Voucher history
- `Google Pay/Money remittances and requests/*.csv` - Money transfers

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. All data processing must remain client-side
2. No external network calls (except for CDN resources)
3. Maintain TypeScript strict mode compliance
4. Follow existing code style and structure
5. Test with real Google Pay data exports

## Future Enhancements

- AI-generated personalized narratives using local LLMs
- More insight types based on spending patterns
- Comparison with previous years
- Dark mode
- Additional export formats

## License

MIT License - feel free to use this project however you'd like!

## Acknowledgments

- Inspired by Spotify Wrapped
- Built with privacy-first principles
- No affiliation with Google Pay or Google

## Support

If you encounter any issues or have questions:

1. Check that your Google Takeout export includes Google Pay data
2. Ensure the ZIP file is not corrupted
3. Try a different browser
4. Open an issue on GitHub with details about your problem

---

Made with privacy in mind. Your data stays yours.
