
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StorageItem {
  key: string;
  value: any;
}

export default function StorageTestPage() {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = () => {
    if (typeof window === 'undefined') {
      return;
    }
    setLoading(true);
    const allItems: StorageItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          const parsedValue = value ? JSON.parse(value) : null;
          allItems.push({ key, value: parsedValue });
        } catch (e) {
          // If parsing fails, store the raw value
          allItems.push({ key, value: localStorage.getItem(key) });
        }
      }
    }
    setItems(allItems);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const totalSize = items.reduce((acc, item) => {
    const valueSize = JSON.stringify(item.value).length;
    return acc + valueSize;
  }, 0);
  const totalSizeKB = (totalSize / 1024).toFixed(2);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">Teste do Local Storage</h2>
        <Button onClick={loadItems}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens no Local Storage</CardTitle>
          <CardDescription>
            Aqui está tudo o que está salvo no `localStorage` do seu navegador para este site. 
            Tamanho total aproximado: {totalSizeKB} KB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : items.length === 0 ? (
            <p>O Local Storage está vazio.</p>
          ) : (
            <ScrollArea className="h-[60vh] w-full rounded-md border">
              <div className="p-4 space-y-4">
                {items.map((item) => (
                  <Card key={item.key}>
                    <CardHeader className="p-4">
                      <CardTitle className="text-lg font-mono break-all">{item.key}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(item.value, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
