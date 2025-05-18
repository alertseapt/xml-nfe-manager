export interface NFe {
  nfeProc: {
    NFe: {
      infNFe: {
        ide: {
          nNF: string;
          serie?: string;
          dhEmi?: string;
          finNFe?: string;
        };
        emit: {
          xNome?: string;
          CNPJ?: string;
          CPF?: string;
        };
        dest: {
          xNome: string;
          CNPJ?: string;
          CPF?: string;
        };
        det: Array<{
          prod: {
            cProd: string;
            xProd: string;
            uCom: string;
            qCom: number | string;
            vUnCom: number | string;
            vProd: number | string;
            cEAN?: string;
            NCM?: string;
          };
        }>;
        total?: {
          ICMSTot?: {
            vNF?: string;
          };
        };
      };
    };
    protNFe?: {
      infProt?: {
        chNFe?: string;
      };
    };
  };
}

export interface Product {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  ean?: string;
} 