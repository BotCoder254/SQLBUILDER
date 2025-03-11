import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiDatabase,
  FiUsers,
  FiLayers,
  FiGitBranch,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { useState } from 'react';

const features = [
  {
    icon: <FiDatabase className="w-6 h-6" />,
    title: 'Visual Schema Design',
    description:
      'Design your database schema visually with an intuitive drag-and-drop interface.',
  },
  {
    icon: <FiUsers className="w-6 h-6" />,
    title: 'Real-time Collaboration',
    description:
      'Work together with your team in real-time to design and modify database schemas.',
  },
  {
    icon: <FiLayers className="w-6 h-6" />,
    title: 'Multiple Database Support',
    description:
      'Support for various database types including SQL, NoSQL, and more.',
  },
  {
    icon: <FiGitBranch className="w-6 h-6" />,
    title: 'Version Control',
    description:
      'Track changes and maintain different versions of your database schema.',
  },
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#211c84] to-[#b5a8d5]">
      {/* Navigation */}
      <nav className="relative container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-white text-2xl font-bold">SchemaBuilder</div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none"
            >
              {isMenuOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="text-white hover:text-[#7a73d1]">
              Features
            </a>
            <Link to="/login" className="text-white hover:text-[#7a73d1]">
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-white text-[#211c84] px-4 py-2 rounded-lg hover:bg-[#7a73d1] hover:text-white transition-colors duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#211c84] p-4 rounded-b-lg">
            <div className="flex flex-col space-y-4">
              <a
                href="#features"
                className="text-white hover:text-[#7a73d1]"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <Link
                to="/login"
                className="text-white hover:text-[#7a73d1]"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-white text-[#211c84] px-4 py-2 rounded-lg hover:bg-[#7a73d1] hover:text-white transition-colors duration-300 text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Design Your Database
            <br />
            Schemas Visually
          </h1>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Create, modify, and collaborate on database schemas with our intuitive
            visual builder. Perfect for teams of all sizes.
          </p>
          <Link
            to="/signup"
            className="bg-white text-[#211c84] px-8 py-4 rounded-lg text-xl font-semibold hover:bg-[#7a73d1] hover:text-white transition-colors duration-300"
          >
            Start Building Now
          </Link>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16"
        >
          <img
            src="https://source.unsplash.com/random/?database,technology,coding"
            alt="Schema Builder"
            className="rounded-lg shadow-2xl mx-auto max-w-4xl w-full"
          />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-[#211c84] mb-16">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <div className="text-[#4D55CC] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[#211c84] mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-4xl font-bold text-white mb-8">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">
            Join thousands of developers who are already using our tool to
            streamline their database design process.
          </p>
          <Link
            to="/signup"
            className="bg-white text-[#211c84] px-8 py-4 rounded-lg text-xl font-semibold hover:bg-[#7a73d1] hover:text-white transition-colors duration-300"
          >
            Create Free Account
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-[#211c84] py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-white text-xl font-bold mb-4 md:mb-0">
              SchemaBuilder
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-white hover:text-[#7a73d1]">
                Privacy Policy
              </a>
              <a href="#" className="text-white hover:text-[#7a73d1]">
                Terms of Service
              </a>
              <a href="#" className="text-white hover:text-[#7a73d1]">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 