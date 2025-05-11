export interface NFe {
  nfeProc: {
    NFe: {
      infNFe: {
        ide: {
          nNF: string;
        };
        dest: {
          xNome: string;
        };
        det: Array<{
          prod: {
            cProd: string;
            xProd: string;
            uCom: string;
            qCom: number;
            vUnCom: number;
            vProd: number;
            cEAN?: string;
          };
        }>;
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