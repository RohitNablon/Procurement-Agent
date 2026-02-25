import { createContext, useContext, useState, type ReactNode } from 'react';
import { products } from '../data/products';
import componentsData from '../data/components.json';

interface ProductContextType {
    selectedProductId: string;
    setSelectedProductId: (id: string) => void;
    selectedComponentId: string | null;
    setSelectedComponentId: (id: string | null) => void;
}

const ProductContext = createContext<ProductContextType>({
    selectedProductId: products[0].id,
    setSelectedProductId: () => { },
    selectedComponentId: (componentsData as any[])[0]?.id || null,
    setSelectedComponentId: () => { },
});

export function ProductProvider({ children }: { children: ReactNode }) {
    const [selectedProductId, setSelectedProductId] = useState(products[0].id);
    const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
        (componentsData as any[])[0]?.id || null
    );
    return (
        <ProductContext.Provider value={{ 
            selectedProductId, 
            setSelectedProductId,
            selectedComponentId,
            setSelectedComponentId 
        }}>
            {children}
        </ProductContext.Provider>
    );
}

export function useProduct() {
    return useContext(ProductContext);
}
