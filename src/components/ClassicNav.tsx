import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {logo && <div className="flex-shrink-0">{logo}</div>}
          
          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center gap-2">
            {items.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={index}>
                  <Link
                    to={item.href}
                    className={cn(
                      "px-6 py-2 rounded-lg font-medium transition-all duration-200",
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
