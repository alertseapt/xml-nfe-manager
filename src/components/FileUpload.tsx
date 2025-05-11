import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Paper } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled = false }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml']
    },
    multiple: false,
    disabled
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 3,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: disabled ? '#f5f5f5' : isDragActive ? '#e3f2fd' : 'white',
        border: '2px dashed',
        borderColor: disabled ? '#bdbdbd' : isDragActive ? '#1976d2' : '#e0e0e0',
        '&:hover': {
          backgroundColor: disabled ? '#f5f5f5' : '#e3f2fd',
          borderColor: disabled ? '#bdbdbd' : '#1976d2'
        }
      }}
    >
      <input {...getInputProps()} />
      <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {disabled ? 'Arquivo já carregado' : isDragActive ? 'Solte o arquivo XML aqui' : 'Arraste e solte um arquivo XML aqui, ou clique para selecionar'}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {disabled ? 'Use o botão "Carregar Novo Arquivo" para recomeçar' : 'Apenas arquivos XML são aceitos'}
      </Typography>
    </Paper>
  );
};

export default FileUpload; 