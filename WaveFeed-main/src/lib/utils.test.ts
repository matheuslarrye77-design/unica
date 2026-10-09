import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
	it('should merge multiple class names', () => {
		const result = cn('class1', 'class2', 'class3');

		expect(result).toContain('class1');
		expect(result).toContain('class2');
		expect(result).toContain('class3');
	});

	it('should handle conditional classes correctly', () => {
		const isActive = true;
		const isDisabled = false;

		const result = cn(
			'base-class',
			isActive && 'active-class',
			isDisabled && 'disabled-class'
		);

		expect(result).toContain('base-class');
		expect(result).toContain('active-class');
		expect(result).not.toContain('disabled-class');
	});
});
