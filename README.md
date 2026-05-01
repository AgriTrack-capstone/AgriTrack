# AgriTrack - Smart Farm Assistant

A responsive React.js web application for managing farm operations and tracking agricultural activities.

## Features

### Dashboard
- **AI-Powered Insights**: View your farm's key metrics at a glance
- **Active Fields**: Monitor all your farm fields
- **Crop Health Trend**: Track crop health over time with visual charts
- **Farm Activities**: See a breakdown of farming operations
- **AI Recommendations**: Get intelligent suggestions based on farm data
- **Total Production**: Monitor your total farm output

### Farm Records
- **Activity Tracking**: Record and manage all farming activities
- **Activity Types**: Planting, Irrigation, Fertilizer, Pest Control, Harvest, Expenses
- **Add New Records**: Easy-to-use form to add new farming activities
- **Activity Summary**: Quick view of all activity counts

### Reports & Alerts
- Coming soon (placeholders ready for future implementation)

## Responsive Design

The application is fully responsive and works seamlessly on:
- 📱 Mobile phones (320px and up)
- 📱 Tablets (768px and up)
- 💻 Laptops and desktops (1024px and up)
- 🖥️ Large screens (1400px and up)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Steps

1. **Navigate to the project directory**:
   ```bash
   cd path/to/AgriTrack1.2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   - The app will automatically open at `http://localhost:3000`
   - If not, manually navigate to that URL

## File Structure

```
AgriTrack1.2/
├── public/
│   └── index.html           # Main HTML file
├── src/
│   ├── components/
│   │   ├── Navbar.js        # Navigation bar
│   │   ├── Dashboard.js     # Dashboard page
│   │   ├── FarmRecords.js   # Farm records page
│   │   ├── Reports.js       # Reports page (placeholder)
│   │   └── Alerts.js        # Alerts page (placeholder)
│   ├── styles/
│   │   ├── index.css        # Global styles
│   │   ├── App.css          # App layout styles
│   │   ├── Navbar.css       # Navbar styles
│   │   ├── Dashboard.css    # Dashboard styles
│   │   ├── FarmRecords.css  # Farm records styles
│   │   ├── Reports.css      # Reports styles
│   │   └── Alerts.css       # Alerts styles
│   ├── App.js              # Main app component
│   └── index.js            # Entry point
├── package.json            # Project dependencies
└── README.md              # This file
```

## Available Scripts

### `npm start`
Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm build`
Builds the app for production to the `build` folder.

### `npm test`
Launches the test runner in interactive watch mode.

## Technologies Used

- **React 18.2**: JavaScript library for building user interfaces
- **CSS3**: For responsive styling and animations
- **JavaScript ES6+**: Modern JavaScript features

## Responsive Breakpoints

The application uses the following breakpoints for responsive design:

- **Mobile**: 480px and below
- **Tablet**: 481px - 1024px
- **Desktop**: 1025px - 1200px
- **Large Desktop**: 1201px and above

## Usage Tips

1. **Navigation**: Use the top navigation bar to switch between Dashboard, Farm Records, Reports, and Alerts
2. **Mobile Menu**: On mobile devices, use the hamburger menu (☰) to access navigation
3. **Add Records**: Click the "Add Record" button to log new farming activities
4. **View Recommendations**: Check the AI recommendations section on the dashboard for farming insights

## Future Enhancements

- [ ] Implement Reports functionality
- [ ] Implement Alerts functionality
- [ ] Add backend API integration
- [ ] Add user authentication
- [ ] Add data persistence (database)
- [ ] Add more advanced charts and analytics
- [ ] Add mobile app version

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

The application is optimized for:
- Fast loading times
- Smooth animations
- Efficient rendering
- Mobile performance

## License

This project is part of a capstone project.

## Support

For issues or questions, please contact the development team.
