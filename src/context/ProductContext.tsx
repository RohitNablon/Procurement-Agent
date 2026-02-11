import { createContext, useContext, useState, type ReactNode } from 'react';
import { products } from '../data/products';

interface ProductContextType {
    selectedProductId: string;
    setSelectedProductId: (id: string) => void;
}

const ProductContext = createContext<ProductContextType>({
    selectedProductId: products[0].id,
    setSelectedProductId: () => { },
});

export function ProductProvider({ children }: { children: ReactNode }) {
    const [selectedProductId, setSelectedProductId] = useState(products[0].id);
    return (
        <ProductContext.Provider value={{ selectedProductId, setSelectedProductId }}>
            {children}
        </ProductContext.Provider>
    );
}

export function useProduct() {
    return useContext(ProductContext);
}
