import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, ShoppingCart, Package, CreditCard, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // cents
  image: string;
  category: 'box' | 'print';
}

interface CartItem {
  product: Product;
  quantity: number;
}

const PRODUCTS: Product[] = [
  {
    id: 'starter-box',
    name: 'Starterbox',
    description: 'Komplettes Starterset mit NFC-Box, Aufstellern und Anleitungsmaterial für deinen nächsten Kundenabschluss.',
    price: 0,
    image: '📦',
    category: 'box',
  },
  {
    id: 'visitenkarten-100',
    name: 'Visitenkarten (100 Stk.)',
    description: '100 hochwertige Visitenkarten im Eloyo-Design mit deinem Namen und QR-Code.',
    price: 2900,
    image: '🪪',
    category: 'print',
  },
  {
    id: 'visitenkarten-250',
    name: 'Visitenkarten (250 Stk.)',
    description: '250 hochwertige Visitenkarten im Eloyo-Design mit deinem Namen und QR-Code.',
    price: 4900,
    image: '🪪',
    category: 'print',
  },
  {
    id: 'visitenkarten-500',
    name: 'Visitenkarten (500 Stk.)',
    description: '500 hochwertige Visitenkarten im Eloyo-Design mit deinem Namen und QR-Code.',
    price: 7900,
    image: '🪪',
    category: 'print',
  },
];

function formatPrice(cents: number) {
  if (cents === 0) return 'Kostenlos';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export default function SalesRepOrders() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} hinzugefügt`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = i.quantity + delta;
      return newQty > 0 ? { ...i, quantity: newQty } : i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Dein Warenkorb ist leer');
      return;
    }
    // TODO: Stripe checkout integration
    toast.info('Checkout wird vorbereitet…');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bestellung</h1>
        <p className="text-sm text-muted-foreground">Bestelle Starterboxen, Visitenkarten und weiteres Vertriebsmaterial.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Produkte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRODUCTS.map(product => {
              const inCart = cart.find(i => i.product.id === product.id);
              return (
                <Card key={product.id} className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  inCart && "ring-2 ring-primary/30"
                )}>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl shrink-0">{product.image}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm">{product.name}</h3>
                          <Badge variant={product.price === 0 ? 'secondary' : 'default'} className="shrink-0 text-xs">
                            {formatPrice(product.price)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>

                        <div className="mt-3 flex items-center gap-2">
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(product.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-bold w-6 text-center">{inCart.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(product.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => addToCart(product)}>
                              <Plus className="w-3 h-3" />
                              In den Warenkorb
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Cart */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Warenkorb
            {cartCount > 0 && (
              <Badge variant="secondary" className="text-xs">{cartCount}</Badge>
            )}
          </h2>

          <Card>
            <CardContent className="pt-5">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Dein Warenkorb ist leer.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <span className="text-xl">{item.product.image}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}× {formatPrice(item.product.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-semibold">Gesamt</span>
                      <span className="text-lg font-bold">{formatPrice(cartTotal)}</span>
                    </div>
                    <Button className="w-full gap-2" onClick={handleCheckout}>
                      <CreditCard className="w-4 h-4" />
                      Zur Kasse
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
