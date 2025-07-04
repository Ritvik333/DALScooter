import React, { useState } from 'react';
import axios from 'axios';

const RegistrationForm = ({ role }) => {
  const [step, setStep] = useState(1); // Step 1: Info, Step 2: OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  const apiEndpoint = 'https://e09ryoby30.execute-api.us-east-1.amazonaws.com/prod/auth';

  const securityQuestions = [
    "What is your pet's name?",
    "What is your mother's maiden name?",
    "What is your favorite color?",
    "What city were you born in?",
    "What was your first school's name?"
  ];

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('Sending OTP...');
    const requestBody = {
      action: 'signup',
      email,
      password,
      role,
      security_question: securityQuestion,
      security_answer: securityAnswer,
    };
    try {
      const response = await axios.post(apiEndpoint, requestBody);
      setMessage(response.data.message || 'OTP sent to your email');
      setStep(2); // Move to OTP input
    } catch (error) {
      setMessage('Signup failed. Try again.');
    }
  };

  const handleOtpConfirm = async (e) => {
    e.preventDefault();
    setMessage('Verifying OTP...');
    const requestBody = {
      action: 'signup',
      email,
      password,
      role,
      security_question: securityQuestion,
      security_answer: securityAnswer,
      otp,
    };
    try {
      const response = await axios.post(apiEndpoint, requestBody);
      setMessage(response.data.message || 'Account verified successfully!');
      // Wait a moment (optional), then reset form to step 1
    setTimeout(() => {
        setStep(1);
        setOtp('');
        setMessage('');
        // Optionally reset other fields if you want a clean form:
        setEmail('');
        setPassword('');
        setSecurityQuestion('');
        setSecurityAnswer('');
      }, 2000);  // 2 seconds delay to show success message before reset
    } catch (error) {
      setMessage('OTP verification failed. Try again.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-center">{`Register as ${role}`}</h2>
      {step === 1 ? (
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border p-2" />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border p-2" />
          </div>
          <div>
            <label>Security Question</label>
            <select
              value={securityQuestion}
              onChange={e => setSecurityQuestion(e.target.value)}
              required
              className="w-full border p-2"
            >
              <option value="">Select a question...</option>
              {securityQuestions.map((question, idx) => (
                <option key={idx} value={question}>{question}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Security Answer</label>
            <input type="text" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} required className="w-full border p-2" />
          </div>
          <button className="w-full bg-blue-600 text-white p-2 rounded">Send OTP</button>
        </form>
      ) : (
        <form onSubmit={handleOtpConfirm} className="space-y-4">
          <div>
            <label>Enter OTP</label>
            <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required className="w-full border p-2" />
          </div>
          <button className="w-full bg-green-600 text-white p-2 rounded">Verify OTP</button>
        </form>
      )}
      {message && <p className="mt-4 text-center text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default RegistrationForm;
