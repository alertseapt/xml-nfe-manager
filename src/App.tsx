import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  ThemeProvider,
  createTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { XMLParser } from 'fast-xml-parser';
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

// Helper para formatar data (pode ser útil se alguma informação de data for exibida)
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

function App() {
  const [xmlData, setXmlData] = useState<NFe | null>(null); // Para dados parseados (usado pela ProductList)
  const [rawXmlString, setRawXmlString] = useState<string>(""); // Para a string XML bruta
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [editedProducts, setEditedProducts] = useState<Product[]>([]);
  // NFeInfo simplificado, pode ou não ser necessário dependendo do que resta na UI
  const [nfeInfo, setNfeInfo] = useState<{ numero: string; dataEmissao: string } | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      setRawXmlString(fileContent); // Armazena a string XML bruta

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseTagValue: true,
        trimValues: true,
        numberParseOptions: {
          hex: false,
          leadingZeros: true,
          eNotation: false
        },
        tagValueProcessor: (tagName, tagValue) => {
            const stringFields = ["CNPJ", "CPF", "nNF", "serie", "cProd", "NCM", "cEAN", "chNFe"];
            if (stringFields.includes(tagName)) {
                return String(tagValue);
            }
            return tagValue;
        },
      });
      const result = parser.parse(fileContent) as NFe;
      setXmlData(result);

      let det = result.nfeProc.NFe.infNFe.det;
      if (!Array.isArray(det)) {
        det = [det];
      }

      const extractedProducts = det.map((item: any) => ({
        codigo: String(item.prod.cProd || ""),
        descricao: String(item.prod.xProd || ""),
        unidade: String(item.prod.uCom || ""),
        quantidade: parseFloat(String(item.prod.qCom || "0")) || 0,
        valorUnitario: parseFloat(String(item.prod.vUnCom || "0")) || 0,
        valorTotal: parseFloat(String(item.prod.vProd || "0")) || 0,
        ean: String(item.prod.cEAN || "SEM GTIN")
      }));

      const ide = result.nfeProc.NFe.infNFe.ide;
      setNfeInfo({ // Simplificado
        numero: String(ide.nNF || ""),
        dataEmissao: ide.dhEmi ? formatDate(new Date(ide.dhEmi)) : formatDate(new Date()),
      });

      setOriginalProducts(extractedProducts);
      setEditedProducts(extractedProducts.map(p => ({ ...p })));
      setIsFileUploaded(true);
    };
    reader.readAsText(file);
  };

  const handleSendXmlToRailway = async () => {
    if (!rawXmlString) {
      alert("Nenhum arquivo XML carregado ou conteúdo XML está vazio.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    const xmlBlob = new Blob([rawXmlString], { type: 'application/xml' });
    formData.append('xml', xmlBlob, 'upload.xml');

    try {
      const response = await fetch('https://apitowms-production.up.railway.app/nfe', {
        method: 'POST',
        body: formData,
      });

      setIsLoading(false);
      if (response.ok) {
        try {
            const result = await response.json();
            alert('XML enviado com sucesso para o Railway! Resposta: ' + JSON.stringify(result));
        } catch (jsonError) {
            // Se a resposta não for JSON, mostrar como texto.
            const textResult = await response.text(); 
            alert('XML enviado com sucesso para o Railway! Resposta (não JSON): ' + textResult);
        }
      } else {
        const errorText = await response.text();
        alert(`Falha ao enviar XML para o Railway: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Erro ao enviar XML para o Railway:', error);
      alert(`Erro de comunicação ao enviar XML: ${error.message}`);
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Integração de entrada Mercocamp 
          </Typography>
          <Button variant="outlined" onClick={() => setOpenHelp(true)} sx={{ mb: 2 }}>
            Instruções de Uso
          </Button>
        </Box>

        <FileUpload onFileUpload={handleFileUpload} disabled={isFileUploaded} />

        {isFileUploaded && nfeInfo && (
             <Box sx={{ textAlign: 'center', mt: 2, mb: 2, p:2, border: '1px dashed grey' }}>
                <Typography variant="h6">NFe Carregada</Typography>
                <Typography>Número: {nfeInfo.numero}</Typography>
                <Typography>Data de Emissão: {nfeInfo.dataEmissao}</Typography>
             </Box>
        )}

        {originalProducts.length > 0 && (
          <>
            <ProductList
              products={editedProducts} // Mostrar produtos editados
              onProductsChange={setEditedProducts} // Permitir edição
            />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleReload}
                disabled={isLoading}
              >
                Carregar Novo XML
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendXmlToRailway} // Chamando a nova função
                disabled={isLoading || !isFileUploaded}
              >
                {isLoading ? "Enviando..." : "Enviar XML para Railway"} 
              </Button>
            </Box>
          </>
        )}

        <Dialog open={openHelp} onClose={() => setOpenHelp(false)}>
          <DialogTitle>Como usar a Integração de Entrada Mercocamp</DialogTitle>
          <DialogContent>
            <DialogContentText component="div">
              <ol>
                <li><strong>Upload do Arquivo:</strong> Arraste ou clique para selecionar o arquivo XML da Nota Fiscal.</li>
                <li><strong>Edite os Produtos (Opcional):</strong> Revise e edite os detalhes dos produtos na tabela abaixo. <em>(Nota: Atualmente, as edições não são refletidas no XML enviado para o Railway. O XML original é enviado).</em></li>
                <li><strong>Envie o XML:</strong> Clique no botão "Enviar XML para Railway". Isso enviará o arquivo XML original carregado para o servidor.</li>
                <li><strong>Nova NFe:</strong> Para processar um novo arquivo XML, clique no botão "Carregar Novo XML".</li>
              </ol>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenHelp(false)} color="primary" autoFocus>
              Fechar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App; 