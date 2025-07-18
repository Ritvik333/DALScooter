import React, { useState } from 'react';
import RegistrationForm from './components/RegistrationForm';
import Dashboard from './components/Dashboard';

const App = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);

  if (showDashboard) {
    return <Dashboard role={selectedRole || "guest"} />;
  }

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

        <hr className="w-full my-4 border-gray-400" />

        <button
          className="bg-gray-800 text-white px-6 py-3 rounded hover:bg-gray-900"
          onClick={() => setShowDashboard(true)}
        >
          🔓 Bypass Login → Go to Dashboard
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
