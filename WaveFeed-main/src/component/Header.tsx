import { Link, useNavigate } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { Button } from './ui/button';

export const Header = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const isAuthenticated = useSelector(
		(state: RootState) => state.auth.isAuthenticated
	);

	const handleLogin = () => {
		setIsMenuOpen(false);
		navigate({ to: '/login' });
	};

	const handleRegister = () => {
		setIsMenuOpen(false);
		navigate({ to: '/register' });
	};

	const handleLogout = () => {
		setIsMenuOpen(false);
		dispatch(logout());
		navigate({ to: '/' });
	};

	const handleLinkClick = () => {
		setIsMenuOpen(false);
	};

	return (
		<header className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg border-b border-blue-900/20 relative">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center space-x-8">
						<Link
							to="/"
							className="text-2xl font-bold text-white hover:text-blue-100 transition-colors flex items-center gap-2"
							onClick={handleLinkClick}
						>
							<span className="bg-white/20 px-3 py-1 rounded-lg">🌊</span>
							WaveFeed
						</Link>

						{/* Desktop Navigation */}
						<nav className="hidden md:flex space-x-1">
							<Link
								to="/"
								className="text-white/90 hover:text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-all"
							>
								Home
							</Link>
							<Link
								to="/about"
								className="text-white/90 hover:text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-all"
							>
								About
							</Link>
							<Link
								to="/contacts"
								className="text-white/90 hover:text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-all"
							>
								Contacts
							</Link>
							{isAuthenticated && (
								<Link
									to="/profile"
									className="text-white/90 hover:text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-all"
								>
									Profile
								</Link>
							)}
						</nav>
					</div>

					<div className="hidden md:flex items-center space-x-3">
						{!isAuthenticated ? (
							<>
								<Button
									onClick={handleLogin}
									variant="outline"
									className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
								>
									Login
								</Button>
								<Button
									onClick={handleRegister}
									className="bg-white text-blue-600 hover:bg-blue-50 shadow-md"
								>
									Register
								</Button>
							</>
						) : (
							<Button
								onClick={handleLogout}
								variant="outline"
								className="bg-white/10 border-white/30 text-white hover:bg-red-400 hover:border-red-500 hover:text-white shadow-md transition-all duration-200 group"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="mr-2 group-hover:translate-x-0.5 transition-transform"
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line
										x1="21"
										y1="12"
										x2="9"
										y2="12"
									/>
								</svg>
								Logout
							</Button>
						)}
					</div>

					<button
						onClick={() => setIsMenuOpen(!isMenuOpen)}
						className="md:hidden p-2 rounded-md text-white hover:bg-white/10 transition-colors"
						aria-label="Toggle menu"
					>
						{isMenuOpen ? (
							<X className="h-6 w-6" />
						) : (
							<Menu className="h-6 w-6" />
						)}
					</button>
				</div>
			</div>

			<div
				className={`md:hidden absolute top-16 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-800 border-t border-blue-900/20 shadow-lg transition-all duration-300 ease-in-out ${
					isMenuOpen
						? 'opacity-100 visible max-h-screen'
						: 'opacity-0 invisible max-h-0 overflow-hidden'
				}`}
			>
				<nav className="px-4 py-4 space-y-2">
					<Link
						to="/"
						onClick={handleLinkClick}
						className="block text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md text-base font-medium transition-all"
					>
						Home
					</Link>
					<Link
						to="/about"
						onClick={handleLinkClick}
						className="block text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md text-base font-medium transition-all"
					>
						About
					</Link>
					<Link
						to="/contacts"
						onClick={handleLinkClick}
						className="block text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md text-base font-medium transition-all"
					>
						Contacts
					</Link>
					{isAuthenticated && (
						<Link
							to="/profile"
							onClick={handleLinkClick}
							className="block text-white/90 hover:text-white hover:bg-white/10 px-4 py-3 rounded-md text-base font-medium transition-all"
						>
							Profile
						</Link>
					)}

					<div className="pt-4 border-t border-white/20 space-y-2">
						{!isAuthenticated ? (
							<>
								<Button
									onClick={handleLogin}
									variant="outline"
									className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
								>
									Login
								</Button>
								<Button
									onClick={handleRegister}
									className="w-full bg-white text-blue-600 hover:bg-blue-50 shadow-md"
								>
									Register
								</Button>
							</>
						) : (
							<Button
								onClick={handleLogout}
								variant="outline"
								className="w-full bg-white/10 border-white/30 text-white hover:bg-red-400 hover:border-red-500 hover:text-white shadow-md transition-all duration-200"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="mr-2"
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line
										x1="21"
										y1="12"
										x2="9"
										y2="12"
									/>
								</svg>
								Logout
							</Button>
						)}
					</div>
				</nav>
			</div>
		</header>
	);
};
