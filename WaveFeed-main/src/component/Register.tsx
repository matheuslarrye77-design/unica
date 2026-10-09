import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { store } from '../store';
import type { RegisterData } from '../store/slices/authSlice';
import { register } from '../store/slices/authSlice';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface FormErrors {
	name?: string;
	username?: string;
	email?: string;
	password?: string;
}

const Register = () => {
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const [errors, setErrors] = useState<FormErrors>({});
	const [registerError, setRegisterError] = useState<string | null>(null);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const isAuthenticated = useSelector(
		(state: RootState) => state.auth.isAuthenticated
	);

	const nameRef = useRef<HTMLInputElement>(null);
	const usernameRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	const handleVisible = () => {
		setIsVisible(!isVisible);
	};

	useEffect(() => {
		if (isAuthenticated) {
			navigate({ to: '/' });
		}
	}, [isAuthenticated, navigate]);

	const validateForm = (data: RegisterData): FormErrors => {
		const newErrors: FormErrors = {};

		if (!data.name || data.name.trim().length === 0) {
			newErrors.name = 'Name is required';
		} else if (data.name.trim().length < 2) {
			newErrors.name = 'Name must be at least 2 characters';
		}

		if (!data.username || data.username.trim().length === 0) {
			newErrors.username = 'Username is required';
		} else if (data.username.trim().length < 3) {
			newErrors.username = 'Username must be at least 3 characters';
		}

		if (!data.email || data.email.trim().length === 0) {
			newErrors.email = 'Email is required';
		} else {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(data.email)) {
				newErrors.email = 'Please enter a valid email address';
			}
		}

		if (!data.password || data.password.length === 0) {
			newErrors.password = 'Password is required';
		} else if (data.password.length < 6) {
			newErrors.password = 'Password must be at least 6 characters';
		}

		return newErrors;
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const formData: RegisterData = {
			name: nameRef.current?.value || '',
			username: usernameRef.current?.value || '',
			email: emailRef.current?.value || '',
			password: passwordRef.current?.value || ''
		};

		const validationErrors = validateForm(formData);
		setErrors(validationErrors);

		if (Object.keys(validationErrors).length > 0) {
			return;
		}

		setRegisterError(null);

		dispatch(register(formData));

		setTimeout(() => {
			const currentAuth = store.getState().auth.isAuthenticated;
			if (!currentAuth) {
				setRegisterError('User with this email already exists');
			}
		}, 0);
	};

	return (
		<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-6 sm:py-12 px-4">
			<div className="w-full max-w-md">
				<Card className="shadow-xl border-gray-100">
					<CardHeader className="text-center px-4 sm:px-6 pt-4 sm:pt-6">
						<CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
							Create Account
						</CardTitle>
						<CardDescription className="text-sm sm:text-base">
							Sign up to get started
						</CardDescription>
					</CardHeader>
					<CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
						<form onSubmit={handleSubmit} className="space-y-5">
							<div>
								<Label htmlFor="name" className="mb-2">
									Full Name
								</Label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											className="h-5 w-5 text-gray-400"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<Input
										id="name"
										type="text"
										placeholder="Enter your name"
										ref={nameRef}
										className={`pl-10 ${
											errors.name
												? 'border-red-500 bg-red-50 focus-visible:ring-red-500'
												: ''
										}`}
										required
									/>
								</div>
								{errors.name && (
									<p className="mt-2 text-sm text-red-600 flex items-center gap-1">
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
												clipRule="evenodd"
											/>
										</svg>
										{errors.name}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="username" className="mb-2">
									Username
								</Label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											className="h-5 w-5 text-gray-400"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
										</svg>
									</div>
									<Input
										id="username"
										type="text"
										placeholder="Choose a username"
										ref={usernameRef}
										className={`pl-10 ${
											errors.username
												? 'border-red-500 bg-red-50 focus-visible:ring-red-500'
												: ''
										}`}
										required
									/>
								</div>
								{errors.username && (
									<p className="mt-2 text-sm text-red-600 flex items-center gap-1">
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
												clipRule="evenodd"
											/>
										</svg>
										{errors.username}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="email" className="mb-2">
									Email
								</Label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											className="h-5 w-5 text-gray-400"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
											<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
										</svg>
									</div>
									<Input
										id="email"
										type="email"
										placeholder="Enter your email"
										ref={emailRef}
										className={`pl-10 ${
											errors.email
												? 'border-red-500 bg-red-50 focus-visible:ring-red-500'
												: ''
										}`}
										required
									/>
								</div>
								{errors.email && (
									<p className="mt-2 text-sm text-red-600 flex items-center gap-1">
										<svg
											className="w-4 h-4"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
												clipRule="evenodd"
											/>
										</svg>
										{errors.email}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="password" className="mb-2">
									Password
								</Label>
								<div className="relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<svg
											className="h-5 w-5 text-gray-400"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<Input
										id="password"
										type={isVisible ? 'text' : 'password'}
										placeholder="Create a password"
										ref={passwordRef}
										className={`pl-10 pr-12 ${
											errors.password
												? 'border-red-500 bg-red-50 focus-visible:ring-red-500'
												: ''
										}`}
										required
									/>
								<button
									onClick={handleVisible}
									type="button"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
								>
									{isVisible ? (
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
											/>
										</svg>
									) : (
										<svg
											className="w-5 h-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									)}
								</button>
							</div>
							{errors.password && (
								<p className="mt-2 text-sm text-red-600 flex items-center gap-1">
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
											clipRule="evenodd"
										/>
									</svg>
									{errors.password}
								</p>
							)}
						</div>

						{registerError && (
							<div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
								<div className="flex items-center gap-2">
									<svg
										className="w-5 h-5 text-red-500"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clipRule="evenodd"
										/>
									</svg>
									<p className="text-sm font-medium text-red-800">
										{registerError}
									</p>
								</div>
							</div>
						)}

							<Button
								type="submit"
								className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
							>
								Create Account
							</Button>
						</form>

						<div className="mt-6 text-center">
							<p className="text-sm text-gray-600">
								Already have an account?{' '}
								<Link
									to="/login"
									className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
								>
									Sign in
								</Link>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default Register;
