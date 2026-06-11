const mongoose = require('mongoose');
const Category = require('./models/Category');
const News = require('./models/News');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Clear existing data
    await Admin.deleteMany({});
    await Category.deleteMany({});
    await News.deleteMany({});
    console.log('Existing data cleared');

    // Create admins
    const superAdmin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'super-admin',
    });

    const editor = await Admin.create({
      name: 'Editor User',
      email: 'editor@example.com',
      password: 'editor123',
      role: 'editor',
    });

    const reporter = await Admin.create({
      name: 'Reporter User',
      email: 'reporter@example.com',
      password: 'reporter123',
      role: 'reporter',
    });
    console.log('Admins created:');
    console.log(`- Super Admin: admin@example.com / admin123`);
    console.log(`- Editor: editor@example.com / editor123`);
    console.log(`- Reporter: reporter@example.com / reporter123`);

    // Create categories
    const categories = await Category.create([
      { name: 'Technology', backgroundColor: '#FF6B35', textColor: '#FFFFFF' },
      { name: 'Sports', backgroundColor: '#FFB347', textColor: '#121212' },
      { name: 'Politics', backgroundColor: '#121212', textColor: '#FFFFFF' },
      { name: 'Entertainment', backgroundColor: '#FF69B4', textColor: '#FFFFFF' },
    ]);
    console.log('Categories created');

    // Create news
    const news = await News.create([
      {
        title: 'Breaking News: New Technology Announced',
        description: 'A revolutionary new technology has been unveiled that promises to change the way we live and work.',
        content: 'Full content here...',
        images: ['https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800'],
        category: categories[0]._id,
        reporter: { name: 'John Doe', avatar: 'https://i.pravatar.cc/100' },
        hashtags: ['BreakingNews', 'Technology', 'Innovation'],
        createdBy: editor._id,
        isActive: true,
        breakingText: 'Breaking News',
        publishedDate: new Date(),
      },
      {
        title: 'AI Breakthrough in Healthcare',
        description: 'New AI model developed to detect diseases earlier than ever before.',
        content: 'Full content here...',
        images: ['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800'],
        category: categories[0]._id,
        reporter: { name: 'Alex Johnson', avatar: 'https://i.pravatar.cc/100?img=3' },
        hashtags: ['AI', 'Healthcare', 'Tech'],
        createdBy: reporter._id,
        isActive: true,
        breakingText: 'Breaking News',
        publishedDate: new Date(Date.now() - 86400000),
      },
      {
        title: 'Sports Championship Finals Tonight',
        description: 'The much-anticipated championship finals are happening tonight. Don\'t miss the action!',
        content: 'Full content here...',
        images: ['https://images.unsplash.com/photo-1461896836934-ffe607ba821?w=800'],
        category: categories[1]._id,
        reporter: { name: 'Jane Smith', avatar: 'https://i.pravatar.cc/100?img=2' },
        hashtags: ['Sports', 'Championship', 'Finals'],
        publishedDate: new Date(Date.now() - 86400000),
      },
      {
        title: 'Olympic Team Announced',
        description: 'National Olympic committee reveals final roster for upcoming games.',
        content: 'Full content here...',
        images: ['https://images.unsplash.com/photo-1461896836934-ffe607ba821?w=800'],
        category: categories[1]._id,
        reporter: { name: 'Mike Wilson', avatar: 'https://i.pravatar.cc/100?img=4' },
        hashtags: ['Olympics', 'Sports', 'Team'],
        publishedDate: new Date(Date.now() - 172800000),
      },
    ]);
    console.log('News created');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
