import React, { useState, useEffect } from 'react';
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
  DialogActions,
  TextField
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

// Constante para o Token (vazio por enquanto)
const WMS_TOKEN = "";

// Helper para formatar data
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

function App() {
  const [xmlData, setXmlData] = useState<NFe | null>(null);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [editedProducts, setEditedProducts] = useState<Product[]>([]);
  const [nfeInfo, setNfeInfo] = useState<{ 
    numero: string; 
    destinatarioNome: string; // Nome do destinatário para o nome do arquivo antigo (não mais usado para nome de arquivo)
    cgcClienteWMS: string; // CNPJ/CPF do Destinatário da NFe, será usado como CGCCLIWMS
    emitenteNome: string; // Tornando não opcional, com fallback para ""
    emitenteCGC: string;  // Tornando não opcional, com fallback para ""
    serie: string;        // Tornando não opcional, com fallback para ""
    dataEmissao: string; 
    chaveNFe: string;     // Tornando não opcional, com fallback para ""
    valorTotalNFe: number;
    finNFe: number; // Finalidade da NFe
  } | null>(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Estado para feedback de carregamento
  const [editableCgcClienteWMS, setEditableCgcClienteWMS] = useState<string>("");

  // Efeito para atualizar o CNPJ editável quando nfeInfo mudar (após upload do XML)
  useEffect(() => {
    if (nfeInfo?.cgcClienteWMS) {
      setEditableCgcClienteWMS(nfeInfo.cgcClienteWMS);
    } else {
      setEditableCgcClienteWMS(""); // Limpa se não houver NFe carregada
    }
  }, [nfeInfo]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseTagValue: true, // Importante para que tagValueProcessor funcione
        trimValues: true,
        numberParseOptions: {
          hex: false,
          leadingZeros: true, // Preservar zeros à esquerda para que não sejam truncados antes do tagValueProcessor
          eNotation: false    // NÃO usar notação científica para números
        },
        tagValueProcessor: (tagName, tagValue, jPath, isLeafNode, parentPropertyName) => {
            // Forçar campos específicos a serem strings, caso numberParseOptions não seja suficiente
            const stringFields = ["CNPJ", "CPF", "nNF", "serie", "cProd", "NCM", "cEAN", "chNFe"];
            if (stringFields.includes(tagName)) {
                return String(tagValue);
            }
            return tagValue; 
        },
      });
      const result = parser.parse(e.target?.result as string) as NFe;
      setXmlData(result);
      
      let det = result.nfeProc.NFe.infNFe.det;
      if (!Array.isArray(det)) {
        det = [det];
      }
      
      const extractedProducts = det.map((item: any) => ({
        codigo: String(item.prod.cProd || ""),
        descricao: String(item.prod.xProd || ""),
        unidade: String(item.prod.uCom || ""),
        quantidade: parseFloat(String(item.prod.qCom || "0") ) || 0,
        valorUnitario: parseFloat(String(item.prod.vUnCom || "0")) || 0,
        valorTotal: parseFloat(String(item.prod.vProd || "0")) || 0,
        ean: String(item.prod.cEAN || "SEM GTIN")
      }));
      
      const ide = result.nfeProc.NFe.infNFe.ide;
      const dest = result.nfeProc.NFe.infNFe.dest;
      const emit = result.nfeProc.NFe.infNFe.emit;
      const total = result.nfeProc.NFe.infNFe.total;

      let cgcDestinatario = String(dest.CNPJ || dest.CPF || "");
      // Garantir que o CNPJ tenha 14 dígitos, preenchendo com zeros à esquerda
      // CPF tem 11. CNPJ tem 14. Se vier com menos de 14 e não for CPF, pad.
      if (cgcDestinatario.length > 0 && cgcDestinatario.length < 14 && cgcDestinatario.length !== 11) {
        cgcDestinatario = cgcDestinatario.padStart(14, '0');
      } else if (cgcDestinatario.length > 14) { // Truncar se for maior que 14 (improvável para CNPJ)
        cgcDestinatario = cgcDestinatario.substring(0, 14);
      }

      setNfeInfo({
        numero: String(ide.nNF || ""),
        destinatarioNome: String(dest.xNome || ""), 
        cgcClienteWMS: cgcDestinatario, 
        emitenteNome: String(emit?.xNome || ""),
        emitenteCGC: String(emit?.CNPJ || emit?.CPF || ""),
        serie: String(ide.serie || ""),
        dataEmissao: ide.dhEmi ? formatDate(new Date(ide.dhEmi)) : formatDate(new Date()),
        chaveNFe: String(result.nfeProc.protNFe?.infProt?.chNFe || ""),
        valorTotalNFe: total?.ICMSTot?.vNF ? parseFloat(String(total.ICMSTot.vNF)) : 0,
        finNFe: parseInt(String(ide.finNFe || "1")) || 1,
      });
      
      setOriginalProducts(extractedProducts);
      setEditedProducts(extractedProducts.map(p => ({ ...p })));
      setIsFileUploaded(true);
    };
    reader.readAsText(file);
  };

  const buildProductRegistrationPayload = (cgcClienteWMS: string, products: Product[], originalXmlProds: any[]): any => {
    return {
      "CORPEM_ERP_MERC": {
        "CGCCLIWMS": String(cgcClienteWMS),
        "PRODUTOS": products.map((prod, index) => {
          const originalProdData = originalXmlProds[index]?.prod || {};
          return {
            "CODPROD": String(prod.codigo || originalProdData.cProd || ""),
            "NOMEPROD": String(prod.descricao || originalProdData.xProd || ""), 
            "IWS_ERP": "",
            "TPOLRET": "",
            "IAUTODTVEN": "",
            "QTDDPZOVEN": "",
            "ILOTFAB": "",
            "IDTFAB": "",
            "IDTVEN": "",
            "INSER": "",
            "SEM_LOTE_CKO": "",
            "SEM_DTVEN_CKO": "",
            "CODFAB": "",
            "NOMEFAB": "",
            "CODGRU": "",
            "NOMEGRU": "",
            "CODPROD_FORN": "",
            "NCM": String(originalProdData.NCM || ""), 
            "EMBALAGENS": [
              {
                "CODUNID": String(prod.unidade || originalProdData.uCom || ""),
                "FATOR": "1", 
                "CODBARRA": String(prod.ean || originalProdData.cEAN || "SEM GTIN"),
                "PESOLIQ": "",
                "PESOBRU": "",
                "ALT": "",
                "LAR": "",
                "COMP": "",
                "VOL": ""
              }
            ]
          };
        })
      }
    };
  };

  const buildNfEntryPayload = (
    cgcClienteWMS: string, 
    currentNfeInfo: NonNullable<typeof nfeInfo>, // Garantir que nfeInfo não é null aqui
    products: Product[],
    originalXmlProds: any[]
  ): any => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const numEPedCli = `${currentNfeInfo.numero}-${day}${month}${year}`;

    return {
      "CORPEM_ERP_DOC_ENT": {
        "CGCCLIWMS": String(cgcClienteWMS),
        "CGCREM": String(currentNfeInfo.emitenteCGC), 
        "OBSRESDP": String(currentNfeInfo.emitenteNome), 
        "TPDESTNF": "2", 
        "DEV": "0", 
        "NUMNF": String(currentNfeInfo.numero),
        "SERIENF": String(currentNfeInfo.serie),
        "DTEMINF": currentNfeInfo.dataEmissao, // Já é string formatada
        "VLTOTALNF": String(currentNfeInfo.valorTotalNFe.toString()),
        "NUMEPEDCLI": numEPedCli,
        "CHAVENF": String(currentNfeInfo.chaveNFe),
        "CHAVENF_DEV": "", 
        "ITENS": products.map((prod, index) => {
          const originalProdData = originalXmlProds[index]?.prod || {};
          return {
            "NUMSEQ": (index + 1).toString(),
            "CODPROD": String(prod.codigo || originalProdData.cProd || ""),
            // Garantir que qCom e vProd sejam strings para o payload, mesmo que sejam números em Product
            "QTPROD": String(prod.quantidade || originalProdData.qCom || "0"),
            "VLTOTPROD": String(prod.valorTotal || originalProdData.vProd || "0"),
            "NUMPED_COMPRA": "",
            "LOTFAB": "",
            "DTVEN": "",
            "NUMSEQ_DEV": ""
          };
        })
      }
    };
  };

  const executeSendToWMS = async () => {
    if (!xmlData || !editedProducts.length || !nfeInfo) {
      alert("Dados da NFe ou produtos não carregados corretamente.");
      return;
    }

    // Usar o CNPJ do estado editável
    const currentCgcClienteWMS = editableCgcClienteWMS.replace(/\D/g, ''); // Limpa formatação antes de usar
    if (!currentCgcClienteWMS || currentCgcClienteWMS.length === 0) {
      alert("CNPJ do Cliente WMS (para integração) não pode estar vazio.");
      return;
    }
    // Aplicar padding se necessário, garantindo que tenha 14 dígitos se for CNPJ
    let formattedCgcClienteWMS = currentCgcClienteWMS;
    if (formattedCgcClienteWMS.length > 0 && formattedCgcClienteWMS.length < 14 && formattedCgcClienteWMS.length !== 11) {
        formattedCgcClienteWMS = formattedCgcClienteWMS.padStart(14, '0');
    } else if (formattedCgcClienteWMS.length > 14) {
        formattedCgcClienteWMS = formattedCgcClienteWMS.substring(0, 14);
    }
    
    if (!formattedCgcClienteWMS) {
        alert("CNPJ do Cliente WMS (para integração) inválido após formatação.");
        return;
    }

    setIsLoading(true);

    let originalXmlDet = xmlData.nfeProc.NFe.infNFe.det;
    if (!Array.isArray(originalXmlDet)) {
        originalXmlDet = [originalXmlDet];
    }

    const productPayload = buildProductRegistrationPayload(formattedCgcClienteWMS, editedProducts, originalXmlDet);
    
    try {
      console.log("Enviando cadastro de produtos com CGCCLIWMS:", formattedCgcClienteWMS, JSON.stringify(productPayload, null, 2));
      const productResponse = await fetch('http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'TOKEN_CP': WMS_TOKEN 
        },
        body: JSON.stringify(productPayload)
      });

      const productResultText = await productResponse.text();
      let productResult;
      try {
        productResult = JSON.parse(productResultText);
      } catch (e) {
        console.error("Falha ao parsear JSON da resposta de produtos:", productResultText);
        alert(`Erro na resposta do cadastro de produtos (não JSON): ${productResultText}`);
        setIsLoading(false);
        return;
      }
      
      console.log("Resposta do cadastro de produtos:", productResult);

      if (productResult.CORPEM_WS_OK !== "OK") {
        const erroMsg = productResult.CORPEM_WS_ERRO;
        console.log("Mensagem de erro recebida (lowercase):", typeof erroMsg === 'string' ? erroMsg.toLowerCase() : erroMsg);
        alert(`Falha ao cadastrar produtos: ${erroMsg || 'Erro desconhecido.'}`);
        setIsLoading(false);
        return;
      }
      
      // 2. Entrada de NF
      const nfEntryPayload = buildNfEntryPayload(formattedCgcClienteWMS, nfeInfo, editedProducts, originalXmlDet);
      console.log("Enviando entrada de NF com CGCCLIWMS:", formattedCgcClienteWMS, JSON.stringify(nfEntryPayload, null, 2));
      
      const nfEntryResponse = await fetch('http://webcorpem.no-ip.info:37560/scripts/mh.dll/wc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'TOKEN_CP': WMS_TOKEN
        },
        body: JSON.stringify(nfEntryPayload)
      });

      const nfEntryResultText = await nfEntryResponse.text();
      let nfEntryResult;
      try {
        nfEntryResult = JSON.parse(nfEntryResultText);
      } catch (e) {
        console.error("Falha ao parsear JSON da resposta de entrada de NF:", nfEntryResultText);
        alert(`Erro na resposta da entrada de NF (não JSON): ${nfEntryResultText}`);
        setIsLoading(false);
        return;
      }

      console.log("Resposta da entrada de NF:", nfEntryResult);

      if (nfEntryResult.CORPEM_WS_OK === "OK") {
        alert('Produtos cadastrados e NF de entrada enviada com sucesso!');
      } else {
        alert(`Sucesso ao cadastrar produtos, mas falha ao enviar NF de entrada: ${nfEntryResult.CORPEM_WS_ERRO || 'Erro desconhecido.'}`);
      }

    } catch (error: any) {
      console.error('Erro ao enviar dados para o WMS:', error);
      alert(`Erro de comunicação ao enviar dados para o WMS: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToWMS = () => {
    executeSendToWMS();
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
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              mt: 2, 
              mb: 2, 
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <TextField
              label="CNPJ do cliente WMS"
              variant="outlined"
              value={editableCgcClienteWMS}
              onChange={(e) => setEditableCgcClienteWMS(e.target.value)}
              sx={{ flexGrow: 0, flexShrink: 0, flexBasis: '25%' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: '300px', flexGrow: 1 }}
            >
              <Typography variant="body1" component="p">
                <strong>NF:</strong> {nfeInfo.numero}
              </Typography>
              <Typography variant="body1" component="p">
                <strong>Emitente:</strong> {nfeInfo.emitenteNome}
              </Typography>
            </Box>
          </Paper>
        )}

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
                onClick={handleSendToWMS}
                disabled={isLoading || !isFileUploaded}
              >
                {isLoading ? "Enviando..." : "Enviar Integração"}
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
                <li><strong>Verifique o CNPJ do Cliente WMS:</strong> O CNPJ do destinatário da NFe será pré-preenchido. Confirme ou edite este CNPJ para a correta integração com o Sistema Mercocamp.</li>
                <li><strong>Confira os Dados da NF:</strong> Ao lado do CNPJ, você verá o Número da NF e o Nome do Emitente para referência.</li>
                <li><strong>Edite os Produtos (se necessário):</strong> Revise e edite os detalhes dos produtos na tabela abaixo, como "código do produto", descrição, etc. Caso algum campo seja deixado em branco, será utilizada a informação original do XML para o envio.</li>
                <li><strong>Envie a Integração:</strong> Clique no botão "Enviar Integração". Isso tentará cadastrar os produtos e, em seguida, registrar a entrada da NF no Sistema Mercocamp.</li>
                <li><strong>Nova NFe:</strong> Para processar um novo arquivo XML, clique no botão "Carregar Novo Arquivo" (que aparecerá após o primeiro upload) ou simplesmente atualize a página.</li>
                <li><strong>Atenção:</strong> As informações do XML, o CNPJ do Cliente WMS fornecido e quaisquer edições nos produtos serão usados para a integração. Certifique-se da correção dos dados antes do envio.</li>
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