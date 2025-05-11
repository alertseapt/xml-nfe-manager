import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Product } from '../types/nfe';

interface ProductListProps {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
}

interface EditedProduct {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: number;
  ean: string;
}

const unidades = ['UN', 'KG', 'CX', 'PCT', 'FD', 'DZ', 'SC', 'PÇ'];

const ProductList: React.FC<ProductListProps> = ({ products, onProductsChange }) => {
  const [editedProducts, setEditedProducts] = useState<EditedProduct[]>([]);

  useEffect(() => {
    setEditedProducts(products.map(() => ({
      codigo: '',
      descricao: '',
      unidade: '',
      quantidade: '',
      valorUnitario: '',
      valorTotal: 0,
      ean: ''
    })));
  }, [products]);

  const handleProductChange = (index: number, field: keyof EditedProduct, value: string) => {
    const newProducts = [...editedProducts];
    newProducts[index] = {
      ...newProducts[index],
      [field]: value
    };
    setEditedProducts(newProducts);
    const converted = newProducts.map((p, i) => ({
      codigo: p.codigo,
      descricao: p.descricao,
      unidade: p.unidade,
      quantidade: p.quantidade === '' ? 0 : Number(p.quantidade),
      valorUnitario: p.valorUnitario === '' ? 0 : Number(p.valorUnitario),
      valorTotal: p.valorTotal,
      ean: p.ean
    }));
    onProductsChange(converted);
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#1976d2', '& th': { color: 'white' } }}>
            <TableCell sx={{ minWidth: 100, maxWidth: 130, whiteSpace: 'nowrap' }}>Código do produto</TableCell>
            <TableCell>Descrição</TableCell>
            <TableCell sx={{ minWidth: 80, maxWidth: 100, whiteSpace: 'nowrap' }}>Unidade</TableCell>
            <TableCell sx={{ minWidth: 80, maxWidth: 100, whiteSpace: 'nowrap' }}>Quantidade</TableCell>
            <TableCell sx={{ minWidth: 110, maxWidth: 130, whiteSpace: 'nowrap' }}>Valor unitário</TableCell>
            <TableCell sx={{ minWidth: 100, maxWidth: 130, whiteSpace: 'nowrap' }}>Valor total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {editedProducts.map((product, index) => {
            const blocoColor = index % 2 === 0 ? 'white' : '#f5f5f5';
            return (
              <React.Fragment key={index}>
                <TableRow sx={{ backgroundColor: blocoColor }}>
                  <TableCell sx={{ minWidth: 100, maxWidth: 130, whiteSpace: 'nowrap' }}>{products[index].codigo}</TableCell>
                  <TableCell>{products[index].descricao}</TableCell>
                  <TableCell sx={{ minWidth: 80, maxWidth: 100, whiteSpace: 'nowrap' }}>{products[index].unidade}</TableCell>
                  <TableCell sx={{ minWidth: 80, maxWidth: 100, whiteSpace: 'nowrap' }}>{products[index].quantidade}</TableCell>
                  <TableCell sx={{ minWidth: 110, maxWidth: 130, whiteSpace: 'nowrap' }}>R$ {products[index].valorUnitario.toFixed(2)}</TableCell>
                  <TableCell sx={{ minWidth: 100, maxWidth: 130, whiteSpace: 'nowrap' }}>R$ {products[index].valorTotal.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: blocoColor }}>
                  <TableCell sx={{ minWidth: 100, maxWidth: 130, whiteSpace: 'nowrap' }}>
                    <TextField
                      label="Código Interno"
                      value={product.codigo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleProductChange(index, 'codigo', e.target.value)}
                      sx={{ width: 120 }}
                      inputProps={{ style: { minWidth: 0 } }}
                      placeholder="Código Interno"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      label="Descrição Interna"
                      value={product.descricao}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleProductChange(index, 'descricao', e.target.value)}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 80, maxWidth: 100, whiteSpace: 'nowrap' }}>
                    <FormControl fullWidth>
                      <Select
                        value={product.unidade}
                        onChange={(e: SelectChangeEvent) => handleProductChange(index, 'unidade', e.target.value)}
                        displayEmpty
                        renderValue={(selected) => selected ? selected : <span style={{ color: '#bdbdbd' }}>UN</span>}
                      >
                        {unidades.map((unidade) => (
                          <MenuItem key={unidade} value={unidade}>
                            {unidade}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ minWidth: 80, maxWidth: 100, whiteSpace: 'nowrap' }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantidade"
                      value={product.quantidade}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleProductChange(index, 'quantidade', e.target.value)}
                      placeholder={products[index].quantidade.toString()}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 110, maxWidth: 130, whiteSpace: 'nowrap' }}>
                    {product.quantidade && Number(product.quantidade) > 0
                      ? `R$ ${(products[index].valorTotal / Number(product.quantidade)).toFixed(2)}`
                      : `R$ ${products[index].valorUnitario.toFixed(2)}`}
                  </TableCell>
                  <TableCell sx={{ minWidth: 100, maxWidth: 130, whiteSpace: 'nowrap' }}>
                    <TextField
                      fullWidth
                      label="Código EAN"
                      value={product.ean || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleProductChange(index, 'ean', e.target.value)}
                      placeholder="Código EAN"
                    />
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductList; 