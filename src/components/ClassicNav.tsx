import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
}

interface ClassicNavProps {
  items: NavItem[];
  logo?: React.ReactNode;
}

const ClassicNav = ({ items, logo }: ClassicNavProps) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  // Separate login from other items
  const loginItem = items.find(item => item.href === '/auth');
  const menuItems = items.filter(item => item.href !== '/auth');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {logo && <div className="flex-shrink-0">{logo}</div>}
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {/* Dropdown Menu */}
            <div 
              className="relative"
              onMouseEnter={() => setDesktopMenuOpen(true)}
              onMouseLeave={() => setDesktopMenuOpen(false)}
            >
              <button
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2",
                  "text-foreground hover:bg-muted"
                )}
              >
                Menü
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  desktopMenuOpen && "rotate-180"
                )} />
              </button>
              
              {/* Dropdown */}
              {desktopMenuOpen && (
                <div className="absolute top-full left-0 mt-1 py-2 bg-background border border-border rounded-lg shadow-lg min-w-[180px] z-50">
                  {menuItems.map((item, index) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={index}
                        to={item.href}
                        className={cn(
                          "block px-4 py-2 font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Login Button */}
            {loginItem && (
              <Link
                to={loginItem.href}
                className={cn(
                  "px-6 py-2 rounded-lg font-medium transition-all duration-200",
                  location.pathname === loginItem.href
                    ? "bg-foreground text-background"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {loginItem.label}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <ul className="flex flex-col gap-2">
              {items.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={index}>
                    <Link
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-6 py-3 rounded-lg font-medium transition-all duration-200",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ClassicNav;
