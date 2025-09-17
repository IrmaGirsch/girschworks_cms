# GirschWorks CMS

A modern, multi-tenant Content Management System built for small-to-medium business websites. This system provides a scalable alternative to WordPress with better performance, security, and maintainability.

## 🏗️ Architecture

**Monorepo Structure:**
```
├── apps/
│   ├── api/                 # Backend Express + TypeScript API
│   ├── admin/               # Admin dashboard (Next.js) - Coming Soon
│   └── client-sites/        # Client website generator - Coming Soon
├── packages/
│   ├── database/            # Prisma schema & database client
│   ├── ui/                  # Shared React components - Coming Soon
│   └── config/              # Shared configurations - Coming Soon
```

## 🔧 Tech Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL + Prisma ORM  
- **Authentication**: JWT + bcrypt
- **Monorepo**: Turborepo
- **Frontend**: React + Next.js (planned)
- **Deployment**: Docker ready

## ✅ Current Features

### Authentication System
- [x] JWT-based authentication with refresh tokens
- [x] Secure password hashing with bcrypt
- [x] Multi-tenant user management
- [x] Role-based access control (SUPER_ADMIN, ADMIN, EDITOR, VIEWER)
- [x] Protected API routes with middleware
- [x] User registration and login endpoints

### Database Schema
- [x] Multi-tenant architecture
- [x] User management with tenant isolation
- [x] Site and page content models
- [x] Media storage structure
- [x] SEO metadata support

### Development Infrastructure
- [x] TypeScript throughout
- [x] Turborepo monorepo setup
- [x] Development hot reload
- [x] Environment variable management
- [x] Database migrations with Prisma

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IrmaGirsch/girschworks_cms.git
   cd girschworks_cms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy .env file to both root and database package
   cp .env.example .env
   cp .env packages/database/.env
   ```

   Update `.env` with your database credentials:
   ```env
   DATABASE_URL="postgres://username:password@localhost:5432/girschworks_cms"
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

### Testing Authentication

The API will be running at `http://localhost:4000`. Test the authentication endpoints:

**Register a new tenant and admin user:**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Doe",
    "tenantName": "Your Company",
    "tenantDomain": "yourcompany.com"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "securepassword123"
  }'
```

## 📁 Project Structure

### API (`apps/api`)
- **Authentication**: JWT-based auth with tenant isolation
- **Middleware**: Route protection and validation
- **Database**: Prisma client integration
- **Security**: Helmet, CORS, rate limiting ready

### Database Package (`packages/database`)
- **Schema**: Multi-tenant Prisma schema
- **Models**: Users, Tenants, Sites, Pages, Media
- **Client**: Singleton Prisma client with connection management

## 🛡️ Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT tokens with expiration
- SQL injection protection via Prisma
- CORS configuration
- Security headers with Helmet
- Input validation with Zod
- Multi-tenant data isolation

## 🗄️ Database Schema

### Core Models
- **Tenants**: Organizations/companies using the CMS
- **Users**: Multi-role users with tenant association  
- **Sites**: Websites belonging to tenants
- **Pages**: Individual web pages with rich content
- **Media**: File storage with metadata

### Relationships
- One tenant has many users, sites
- One site has many pages, media files
- One user can create many pages
- Built-in cascade deletion for data consistency

## 🔧 Development Commands

```bash
# Start all development servers
npm run dev

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push       # Push schema to database  
npm run db:migrate    # Create new migration
npm run db:studio     # Open Prisma Studio

# Build for production
npm run build

# Linting and testing
npm run lint
npm run test
```

## 🚦 Current Status

**Phase 1 Complete: Foundation**
- ✅ Monorepo setup with Turborepo
- ✅ Database schema and authentication
- ✅ API architecture and security
- ✅ Development environment

**Phase 2 In Progress: Core CMS**
- 🔄 Content management APIs
- 🔄 File upload and media handling  
- 🔄 Multi-tenant middleware enhancement

**Phase 3 Planned: Frontend**
- 📅 Admin dashboard (Next.js)
- 📅 Client website generator
- 📅 Theme system

**Phase 4 Planned: Deployment**
- 📅 Docker containerization
- 📅 CI/CD pipeline
- 📅 Production deployment

## 👥 Team

This project serves as the foundation for GirschWorks Digital's custom CMS solution, designed to replace WordPress for our SMB clients with a more secure, performant, and maintainable alternative.

## 📄 License

Private - GirschWorks Digital LLC