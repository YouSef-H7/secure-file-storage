import React from 'react';
import { AppRoutes } from './routes';
import { ErrorBoundary } from '../components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
};

export default App;

