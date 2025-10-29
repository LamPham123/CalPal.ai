#!/usr/bin/env node

/**
 * Setup checker - helps you configure the app
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 CalPal AI Setup Checker\n');

const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.local.example');

// Check if .env.local exists
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local not found');
  console.log('📝 Creating .env.local from example...\n');

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env.local\n');
  }
}

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const env = {};

lines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

// Check each required variable
const checks = [
  {
    name: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth Client ID',
    example: 'your-client-id.apps.googleusercontent.com',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth Client Secret',
    example: 'your-secret-here',
  },
  {
    name: 'GOOGLE_REDIRECT_URI',
    description: 'OAuth redirect URI',
    example: 'http://localhost:3000/api/auth/callback',
  },
  {
    name: 'ENCRYPTION_KEY',
    description: 'Encryption key for tokens',
    generate: true,
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth secret',
    generate: true,
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'App URL',
    example: 'http://localhost:3000',
  },
  {
    name: 'NEXT_PUBLIC_CONVEX_URL',
    description: 'Convex deployment URL',
    example: 'https://your-deployment.convex.cloud',
    convex: true,
  },
];

console.log('📋 Environment Variables Check:\n');

let missingCount = 0;
const updates = {};

checks.forEach(check => {
  const value = env[check.name] || '';
  const isEmpty = !value || value === check.example || value.includes('your-');

  if (isEmpty) {
    console.log(`❌ ${check.name}`);
    console.log(`   ${check.description}`);

    if (check.generate) {
      const generated = crypto.randomBytes(32).toString('base64');
      console.log(`   🎲 Generated: ${generated.substring(0, 20)}...`);
      updates[check.name] = generated;
    } else if (check.convex) {
      console.log(`   ℹ️  Run 'npx convex dev' to generate this`);
    } else {
      console.log(`   📝 Example: ${check.example}`);
    }
    console.log('');
    missingCount++;
  } else {
    console.log(`✅ ${check.name}`);
  }
});

// Update .env.local with generated keys
if (Object.keys(updates).length > 0) {
  console.log('\n🔧 Updating .env.local with generated keys...\n');

  let newContent = envContent;
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(newContent)) {
      newContent = newContent.replace(regex, `${key}=${value}`);
    } else {
      newContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, newContent);
  console.log('✅ Auto-generated encryption keys added to .env.local\n');
}

console.log('\n' + '='.repeat(60));

if (missingCount === 0) {
  console.log('\n✅ All environment variables are set!\n');
  console.log('Next steps:');
  console.log('  1. Make sure Convex is running: npx convex dev');
  console.log('  2. Start Next.js: npm run dev');
  console.log('  3. Visit http://localhost:3000\n');
} else {
  console.log(`\n⚠️  ${missingCount} variable(s) need attention\n`);
  console.log('Next steps:\n');

  if (!env.NEXT_PUBLIC_CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL.includes('your-')) {
    console.log('1. 🔧 Initialize Convex:');
    console.log('   npx convex dev');
    console.log('   (This will auto-fill CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL)\n');
  }

  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.includes('your-')) {
    console.log('2. 🔑 Set up Google OAuth:');
    console.log('   • Go to https://console.cloud.google.com/');
    console.log('   • Create/select project');
    console.log('   • Enable Google Calendar API');
    console.log('   • Create OAuth 2.0 credentials');
    console.log('   • Add redirect URI: http://localhost:3000/api/auth/callback');
    console.log('   • Copy Client ID and Secret to .env.local');
    console.log('   • See SETUP.md for detailed instructions\n');
  }

  console.log('3. 📝 Edit .env.local and fill in the missing values\n');
}

console.log('='.repeat(60) + '\n');
