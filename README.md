# Smart Stock - Inventory Management System

A comprehensive inventory management mobile application built with React Native and Expo, featuring offline-first architecture with cloud sync capabilities.

## 🚀 Features

### Core Functionality
- **Product Management**: Add, edit, delete, and categorize products
- **Inventory Tracking**: Real-time stock levels with alerts
- **POS Checkout**: Customer sales with payment processing
- **Internal Checkout**: Employee item tracking with reasons
- **Reports & Analytics**: Business insights and performance metrics
- **Offline Support**: Works without internet connection
- **Cloud Sync**: Automatic data synchronization when online

### Technical Features
- **Hybrid Architecture**: Offline-first with cloud backup
- **SQLite Database**: Local data storage for offline functionality
- **Modern UI/UX**: Dark/light mode support with intuitive design
- **TypeScript**: Full type safety and better development experience
- **Expo Router**: File-based navigation system
- **Responsive Design**: Optimized for mobile devices

## 📱 Screens

### 1. Dashboard
- Overview of key metrics
- Quick action buttons
- Recent activity feed
- Online/offline status indicator

### 2. Products
- Product catalog with search and filtering
- Category-based organization
- Add/edit/delete products
- SKU and barcode management

### 3. Inventory
- Real-time stock levels
- Low stock alerts
- Stock adjustment functionality
- Location-based inventory tracking

### 4. Checkout
- **POS Mode**: Customer sales with payment processing
- **Internal Mode**: Employee item tracking with reasons
- Cart management
- Transaction history

### 5. Reports
- Sales analytics
- Inventory reports
- Top-selling products
- Export functionality

## 🏗️ Architecture

### Database Schema
```sql
-- Products table
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT,
  category TEXT,
  price REAL NOT NULL,
  cost REAL,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 100,
  location TEXT DEFAULT 'main',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products (id)
);

-- Transactions table
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  total_amount REAL,
  employee_id INTEGER,
  customer_name TEXT,
  payment_method TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sync_status TEXT DEFAULT 'pending'
);

-- Sync queue table
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  action TEXT NOT NULL,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Offline-First Design
- **Local SQLite Database**: All data stored locally
- **Sync Queue**: Pending changes queued for cloud sync
- **Conflict Resolution**: Smart merging of local and cloud data
- **Background Sync**: Automatic synchronization when online

## 🛠️ Technology Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe JavaScript
- **Expo Router**: File-based navigation
- **React Native Safe Area**: Safe area handling

### Database & Storage
- **Expo SQLite**: Local database storage
- **AsyncStorage**: Key-value storage for settings
- **File System**: Image and file storage

### UI/UX
- **React Native StyleSheet**: Styling system
- **Expo Vector Icons**: Icon library
- **Dark/Light Mode**: Theme support
- **Responsive Design**: Mobile-first approach

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smartStock-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
# Database
DATABASE_NAME=smartstock.db

# Cloud Sync (optional)
CLOUD_API_URL=your-api-url
CLOUD_API_KEY=your-api-key

# App Configuration
APP_NAME=Smart Stock
APP_VERSION=1.0.0
```

### Database Initialization
The app automatically initializes the SQLite database on first launch. The database file is stored locally on the device.

## 📊 Usage

### Adding Products
1. Navigate to the Products tab
2. Tap the "Add" button
3. Fill in product details (name, SKU, category, price)
4. Save the product

### Managing Inventory
1. Go to the Inventory tab
2. View current stock levels
3. Tap the adjust button to modify quantities
4. Set minimum and maximum stock levels

### Processing Sales (POS)
1. Navigate to Checkout tab
2. Select "POS Checkout" mode
3. Add products to cart
4. Enter customer information
5. Process payment
6. Complete sale

### Internal Checkout
1. Select "Internal Checkout" mode
2. Add items being used internally
3. Select department and reason
4. Complete checkout

### Viewing Reports
1. Go to Reports tab
2. Select time period (Today, Week, Month, Year)
3. View analytics and metrics
4. Export reports if needed

## 🔄 Sync Process

### How Sync Works
1. **Local Changes**: All changes are saved to local SQLite database
2. **Sync Queue**: Changes are added to sync queue for cloud upload
3. **Background Sync**: When online, changes are uploaded to cloud
4. **Conflict Resolution**: Conflicts are resolved automatically
5. **Data Consistency**: Local and cloud data are kept in sync

### Sync Status
- **Online**: Real-time sync with cloud
- **Offline**: Local operations only
- **Syncing**: Background sync in progress
- **Error**: Sync failed, retry available

## 🎨 UI/UX Features

### Design System
- **Color Scheme**: iOS-style colors with dark/light mode support
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standardized padding and margins
- **Components**: Reusable UI components

### Accessibility
- **Voice Over**: Screen reader support
- **Large Text**: Dynamic type scaling
- **High Contrast**: Enhanced visibility options
- **Touch Targets**: Minimum 44pt touch areas

## 🚀 Deployment

### Building for Production

1. **Configure app.json**
   ```json
   {
     "expo": {
       "name": "Smart Stock",
       "slug": "smart-stock",
       "version": "1.0.0",
       "platforms": ["ios", "android"],
       "icon": "./assets/icon.png",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#ffffff"
       }
     }
   }
   ```

2. **Build the app**
   ```bash
   # iOS
   expo build:ios
   
   # Android
   expo build:android
   ```

3. **Submit to stores**
   - iOS: Submit to App Store Connect
   - Android: Submit to Google Play Console

## 🔒 Security

### Data Protection
- **Local Encryption**: SQLite database encryption
- **Secure Storage**: Sensitive data in secure storage
- **Network Security**: HTTPS for all API calls
- **Input Validation**: Client-side validation

### Privacy
- **Data Minimization**: Only collect necessary data
- **User Consent**: Clear privacy policy
- **Data Retention**: Configurable retention policies
- **GDPR Compliance**: European privacy standards

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Performance

### Optimization Techniques
- **Lazy Loading**: Load data on demand
- **Image Optimization**: Compressed images
- **Database Indexing**: Optimized queries
- **Memory Management**: Efficient state management

### Benchmarks
- **App Launch**: < 2 seconds
- **Database Queries**: < 100ms
- **UI Responsiveness**: 60fps
- **Memory Usage**: < 100MB

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Database Schema](docs/database.md)
- [Deployment Guide](docs/deployment.md)

### Community
- [GitHub Issues](https://github.com/your-repo/issues)
- [Discord Server](https://discord.gg/your-server)
- [Email Support](mailto:support@smartstock.com)

## 🔮 Roadmap

### Version 1.1
- [ ] Barcode scanning
- [ ] Advanced analytics
- [ ] Multi-location support
- [ ] User management

### Version 1.2
- [ ] AI-powered forecasting
- [ ] Supplier management
- [ ] Purchase orders
- [ ] Advanced reporting

### Version 2.0
- [ ] Web dashboard
- [ ] API integration
- [ ] Third-party integrations
- [ ] Advanced automation

---

**Smart Stock** - Modern inventory management for the digital age.
