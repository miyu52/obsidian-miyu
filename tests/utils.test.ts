import { describe, expect, it } from 'vitest';
import {
	generateRandomString,
	getRandomOptions,
} from '../src/utils';

describe('getRandomOptions', () => {
	it('maps random-file settings to string options', () => {
		expect(
			getRandomOptions({
				length: 12,
				uppercase: true,
				lowercase: false,
				numbers: true,
				symbols: false,
			}),
		).toEqual({
			length: 12,
			useUppercase: true,
			useLowercase: false,
			useNumbers: true,
			useSymbols: false,
		});
	});
});

describe('generateRandomString', () => {
	it('generates a string of the requested length', () => {
		const s = generateRandomString(
			{ length: 8, useUppercase: true, useLowercase: false, useNumbers: false, useSymbols: false },
			'en',
		);
		expect(s).toHaveLength(8);
	});

	it('only uses enabled character sets', () => {
		const s = generateRandomString(
			{ length: 200, useUppercase: false, useLowercase: false, useNumbers: true, useSymbols: false },
			'en',
		);
		expect(s).toMatch(/^[0-9]+$/);
	});

	it('throws when no charset is enabled', () => {
		expect(() =>
			generateRandomString(
				{ length: 8, useUppercase: false, useLowercase: false, useNumbers: false, useSymbols: false },
				'en',
			),
		).toThrow();
	});
});
