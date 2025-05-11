import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper,
  Button,
  ThemeProvider,
  createTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import ProductList from './components/ProductList';
import FileUpload from './components/FileUpload';
import { NFe, Product } from './types/nfe';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [xmlData, setXmlData] = useState<NFe | null>(null);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [editedProducts, setEditedProducts] = useState<Product[]>([]);
  const [nfeInfo, setNfeInfo] = useState<{ numero: string; destinatario: string } | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      });
      const result = parser.parse(e.target?.result as string) as NFe;
      setXmlData(result);
      
      // Garantir que det seja sempre um array
      let det = result.nfeProc.NFe.infNFe.det;
      if (!Array.isArray(det)) {
        det = [det];
      }
      
      // Extrair produtos do XML
      const extractedProducts = det.map((item: any) => ({
        codigo: item.prod.cProd,
        descricao: item.prod.xProd,
        unidade: item.prod.uCom,
        quantidade: item.prod.qCom,
        valorUnitario: item.prod.vUnCom,
        valorTotal: item.prod.vProd,
        ean: item.prod.cEAN
      }));
      
      // Extrair informações da NF
      const numeroNF = result.nfeProc.NFe.infNFe.ide.nNF;
      const destinatario = result.nfeProc.NFe.infNFe.dest.xNome;
      setNfeInfo({
        numero: numeroNF,
        destinatario: destinatario.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')
      });
      
      setOriginalProducts(extractedProducts);
      setEditedProducts(extractedProducts.map(() => ({
        codigo: '',
        descricao: '',
        unidade: '',
        quantidade: 0,
        valorUnitario: 0,
        valorTotal: 0,
        ean: ''
      })));
      setIsFileUploaded(true);
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!xmlData || !editedProducts.length || !nfeInfo) return;

    // Criar uma cópia do XML original
    const modifiedXml = { ...xmlData };
    
    // Atualizar os produtos no XML com os valores editados
    modifiedXml.nfeProc.NFe.infNFe.det = modifiedXml.nfeProc.NFe.infNFe.det.map((item: any, index: number) => {
      const product = editedProducts[index];
      return {
        ...item,
        prod: {
          ...item.prod,
          cProd: product.codigo || item.prod.cProd,
          xProd: product.descricao || item.prod.xProd,
          uCom: product.unidade || item.prod.uCom,
          qCom: product.quantidade || item.prod.qCom,
          vUnCom: product.valorUnitario || item.prod.vUnCom,
          vProd: item.prod.vProd,
          cEAN: product.ean || item.prod.cEAN
        }
      };
    });

    // Converter o XML modificado para string
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  '
    });
    const xmlString = builder.build(modifiedXml);

    // Criar e fazer download do arquivo
    const blob = new Blob([xmlString], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NF${nfeInfo.numero}_${nfeInfo.destinatario}.xml`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Editor de XML
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setOpenHelp(true)}
              >
                Como usar?
              </Button>
              {isFileUploaded && (
                <Button 
                  variant="contained" 
                  color="secondary" 
                  onClick={handleReload}
                >
                  Carregar Novo Arquivo
                </Button>
              )}
            </Box>
            <FileUpload onFileUpload={handleFileUpload} disabled={isFileUploaded} />
          </Paper>

          <Dialog open={openHelp} onClose={() => setOpenHelp(false)}>
            <DialogTitle>Como usar o Editor de XML - MERCOCAMP</DialogTitle>
            <DialogContent>
              <DialogContentText>
                <ul>
                  <li>Faça upload de um arquivo XML de Nota Fiscal arrastando-o para a área indicada ou clicando para selecionar.</li>
                  <li>Os produtos da nota serão exibidos em uma tabela, com campos para edição de informações internas.</li>
                  <li>Preencha os campos desejados para cada produto.</li>
                  <li>Clique em "Baixar XML Modificado" para gerar e baixar o novo arquivo XML com as alterações.</li>
                  <li>Para carregar outro arquivo, clique em "Carregar Novo Arquivo".</li>
                  <li>O nome do arquivo baixado será composto pelo número da nota e os primeiros caracteres do destinatário.</li>
                  <li><b>Atenção:</b> qualquer campo não preenchido manterá a informação original no XML baixado.</li>
                </ul>
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenHelp(false)} color="primary" autoFocus>
                Fechar
              </Button>
            </DialogActions>
          </Dialog>

          {originalProducts.length > 0 && (
            <>
              <ProductList 
                products={originalProducts} 
                onProductsChange={setEditedProducts}
              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleDownload}
                >
                  Baixar XML Modificado
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App; 