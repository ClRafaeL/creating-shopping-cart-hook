import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect
} from 'react';

import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [ stock, setStock ] = useState<Stock[]>();
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem('@RocketShoes:cart');

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  useEffect(() => {
    async function loadStock() {
      const stock = await api.get<Stock[]>('/stock').then(response => {
        return response.data;
      });
      setStock(stock);
      console.log(stock);
    }

    loadStock();
  }, []);

  const addProduct = async (productId: number) => {
    try {
      const productStock = stock?.find(stock => stock.id === productId);
      if (!productStock || productStock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return ;
      }

      const productInCart = cart.find(product => product.id === productId);

      if (productInCart) {
        updateProductAmount({productId, amount: productInCart.amount + 1 });
        return ;
      }

      const product = await api.get(`/products/${productId}`).then(response => {
        return response.data;
      });

      const newCart = [ ...cart, { ...product, amount: 1} ];
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
      toast.success('Ténis adicionado ao carrinho. ');
    } catch {
      toast.error('Erro na adição do ténis');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      toast.success('Ténis removido do carrinho');
    } catch {
      toast.error('Erro na remoção do ténis');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }

    const productStock = stock?.find(stock => stock.id === productId);
    if (!productStock || productStock.amount < 1) {
      toast.error('Quantidade solicitada fora de estoque');
      return ;
    }

    try {
      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      } );

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      toast.success('Ténis adicionado ao carrinho')
    } catch {
      toast.error('Erro na alteração de quantidade do ténis');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
