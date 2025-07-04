import React, { useState } from 'react';
import RegistrationForm from './components/RegistrationForm';

const App = () => {
  const [selectedRole, setSelectedRole] = useState(null);

  if (!selectedRole) {
    return (
      <div className="bg-gray-100 min-h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <h1 className="text-3xl font-bold mb-4">Register as:</h1>
        <button
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          onClick={() => setSelectedRole('Customer')}
        >
          Customer
        </button>
        <button
          className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
          onClick={() => setSelectedRole('Operator')}
        >
          Operator
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <div>
        <button
          onClick={() => setSelectedRole(null)}
          className="mb-4 text-blue-600 underline"
        >
          ← Back to role selection
        </button>
        <RegistrationForm role={selectedRole} />
      </div>
    </div>
  );
};

export default App;
