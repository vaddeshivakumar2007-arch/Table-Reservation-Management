const https = require('https');
const fs = require('fs');
const path = require('path');

const images = [
  {
    name: 'restaurant.jpg',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'hero-banner.jpg',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80'
  },
  {
    name: 'tables.jpg',
    url: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80'
  },
  {
    name: 'food1.jpg',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'
  },
  {
    name: 'food2.jpg',
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80'
  },
  {
    name: 'food3.jpg',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80'
  },
  {
    name: 'ambience.jpg',
    url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80'
  },
  {
    name: 'table-outdoor.jpg',
    url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=1000&q=80'
  },
  {
    name: 'table-vip.jpg',
    url: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1000&q=80'
  }
];

const destDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function downloadImage(imgObj) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(destDir, imgObj.name);
    const file = fs.createWriteStream(filePath);
    
    https.get(imgObj.url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${imgObj.name}`);
            resolve();
          });
        }).on('error', reject);
      } else {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${imgObj.name}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.error(`Error downloading ${imgObj.name}:`, err.message);
      resolve(); // Do not fail the whole process
    });
  });
}

async function run() {
  for (const img of images) {
    await downloadImage(img);
  }
  console.log('Finished downloading all images.');
}

run();

