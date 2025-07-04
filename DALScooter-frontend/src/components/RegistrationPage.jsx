import React, { useState } from 'react';
import RegistrationForm from './RegistrationForm';

const RegisterPage = () => {
  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      {!selectedRole ? (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold">Choose Role to Register</h2>
          <button
            onClick={() => setSelectedRole('customer')}
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Register as Customer
          </button>
          <button
            onClick={() => setSelectedRole('operator')}
            className="w-full bg-green-600 text-white p-2 rounded"
          >
            Register as Operator
          </button>
        </div>
      ) : (
        <RegistrationForm role={selectedRole} />
      )}
    </div>
  );
};

export default RegisterPage;
