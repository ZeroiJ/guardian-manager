/**
 * A tree of the parsed query. Boolean/unary operators have children (operands) that
 * describe their relationship.
 */
export type QueryAST = AndOp | OrOp | NotOp | FilterOp | NoOp;

export interface QueryASTCommon {
    error?: Error;
    comment?: string;
    startIndex: number;
    length: number;
}

export interface AndOp extends QueryASTCommon {
    op: 'and';
    operands: QueryAST[];
}

export interface OrOp extends QueryASTCommon {
    op: 'or';
    operands: QueryAST[];
}

export interface NotOp extends QueryASTCommon {
    op: 'not';
    operand: QueryAST;
}

export interface FilterOp extends QueryASTCommon {
    op: 'filter';
    type: string;
    args: string;
}

export interface NoOp extends QueryASTCommon {
    op: 'noop';
}

class PeekableGenerator<T> {
    private gen: Generator<T>;
    private nextValue: T | undefined;

    constructor(gen: Generator<T>) {
        this.gen = gen;
    }

    peek(): T | undefined {
        if (!this.nextValue) {
            const n = this.gen.next();
            if (!n.done) {
                this.nextValue = n.value;
            }
        }
        return this.nextValue;
    }

    pop(): T | undefined {
        if (this.nextValue) {
            const ret = this.nextValue;
            this.nextValue = undefined;
            return ret;
        }
        const n = this.gen.next();
        if (!n.done) {
            return n.value;
        }
    }
}

const operators = {
    implicit_and: { precedence: 1, op: 'and' },
    or: { precedence: 2, op: 'or' },
    and: { precedence: 3, op: 'and' },
} as const;

export function parseQuery(query: string): QueryAST {
    function parseAtom(tokens: PeekableGenerator<Token>): QueryAST {
        const token = tokens.pop();
        if (!token) throw new Error('expected an atom');

        switch (token.type) {
            case 'filter': {
                const keyword = token.keyword;
                if (keyword === 'not') {
                    return {
                        op: 'not',
                        operand: {
                            op: 'filter',
                            type: 'is',
                            args: token.args,
                            startIndex: token.startIndex,
                            length: token.length,
                        },
                        startIndex: token.startIndex,
                        length: token.length,
                    };
                }
                return {
                    op: 'filter',
                    type: keyword,
                    args: token.args,
                    startIndex: token.startIndex,
                    length: token.length,
                };
            }
            case 'not': {
                const operand = parseAtom(tokens);
                return {
                    op: 'not',
                    operand,
                    startIndex: token.startIndex,
                    length: token.length + operand.length,
                };
            }
            case '(': {
                const result = parse(tokens);
                result.length += result.startIndex - token.startIndex;
                result.startIndex = token.startIndex;
                if (tokens.peek()?.type === ')') {
                    const closeParen = tokens.pop();
                    result.length += closeParen!.length;
                }
                return result;
            }
            case 'comment': {
                const next = parseAtom(tokens);
                return {
                    ...next,
                    comment: token.content,
                    startIndex: next.startIndex,
                    length: next.length,
                };
            }
            default:
                throw new Error(`Unexpected token type, looking for an atom: ${JSON.stringify(token)}`);
        }
    }

    function parse(tokens: PeekableGenerator<Token>, minPrecedence = 1): QueryAST {
        let ast: QueryAST = { op: 'noop', startIndex: 0, length: 0 };

        try {
            ast = parseAtom(tokens);

            let token: Token | undefined;
            while ((token = tokens.peek())) {
                if (token.type === ')') break;
                
                const operator = operators[token.type as keyof typeof operators];
                if (!operator) throw new Error(`Expected an operator, got ${JSON.stringify(token)}`);
                if (operator.precedence < minPrecedence) break;

                tokens.pop();
                const nextMinPrecedence = operator.precedence + 1;
                const rhs = parse(tokens, nextMinPrecedence);

                if (isSameOp(operator.op, ast)) {
                    ast.operands.push(rhs);
                    ast.length += rhs.length;
                } else {
                    const title = ast.comment;
                    delete ast.comment;
                    ast = {
                        op: operator.op,
                        operands: isSameOp(operator.op, rhs) ? [ast, ...rhs.operands] : [ast, rhs],
                        startIndex: Math.min(rhs.startIndex, ast.startIndex, token.startIndex),
                        length: ast.length + rhs.length + token.length,
                    };
                    if (title) ast.comment = title;
                }
            }
        } catch (e: any) {
            ast.error = e instanceof Error ? e : new Error(String(e));
        }

        return ast;
    }

    const tokens = new PeekableGenerator(lexer(query));
    try {
        if (!tokens.peek()) return { op: 'noop', startIndex: 0, length: 0 };
    } catch (e: any) {
        return { op: 'noop', error: e instanceof Error ? e : new Error(String(e)), startIndex: 0, length: 0 };
    }
    return parse(tokens);
}

function isSameOp<T extends 'and' | 'or'>(binOp: T, op: QueryAST): op is AndOp | OrOp {
    return binOp === op.op;
}

// Lexer
type NoArgTokenType = '(' | ')' | 'not' | 'or' | 'and' | 'implicit_and';
export type Token = { startIndex: number; length: number; quoted?: boolean } & (
    | { type: NoArgTokenType }
    | { type: 'filter'; keyword: string; args: string }
    | { type: 'comment'; content: string }
);

const parens = /(\(\s*|\s*\))/y;
const negation = /-\s*/y;
const booleanKeywords = /(not|\s+or|\s+and)\s+/y;
const filterName = /[a-z]+:/y;
const filterArgs = /[^\s()]+/y;
const bareWords = /[^\s)]+/y;
const whitespace = /\s+/y;
const commentRegex = /\/\*(.*?)\*\/\s*/y;

const singleQuoteLikeCharacters = /[\u2018-\u201A]/g;
const doubleQuoteLikeCharacters = /[\u201C-\u201E]/g;

function normalizeQuotes(str: string) {
    return str.replace(singleQuoteLikeCharacters, "'").replace(doubleQuoteLikeCharacters, '"');
}

export function* lexer(query: string): Generator<Token> {
    query = query.toLowerCase();
    query = normalizeQuotes(query);

    let match: string | undefined;
    let i = 0;

    const consume = (str: string) => (i += str.length);

    const extract = (re: RegExp): string | undefined => {
        re.lastIndex = i;
        const m = re.exec(query);
        if (m) {
            const result = m[0];
            if (result.length > 0) {
                consume(result);
                return m.length > 1 ? m[1] : result;
            }
        }
        return undefined;
    };

    const consumeString = (startingQuoteChar: string) => {
        const initial = i;
        consume(startingQuoteChar);
        let str = '';
        while (i < query.length) {
            const char = query[i];
            consume(char);
            if (char === '\\') {
                const escapeStart = i;
                if (i < query.length) {
                    const escaped = query[i];
                    if (escaped === '"' || escaped === "'" || escaped === '\\') {
                        str += escaped;
                        consume(escaped);
                    } else {
                        throw new Error(`Unrecognized escape sequence \\${escaped} at ${escapeStart}`);
                    }
                } else {
                    str += char;
                }
            } else if (char === startingQuoteChar) {
                return str;
            } else {
                str += char;
            }
        }
        throw new Error(`Unterminated quotes starting at ${initial}`);
    };

    while (i < query.length) {
        const char = query[i];
        const startIndex = i;

        if ((match = extract(parens)) !== undefined) {
            yield { startIndex, length: i - startIndex, type: match.trim() as NoArgTokenType };
        } else if (char === '"' || char === "'") {
            const quotedString = consumeString(char);
            yield {
                startIndex,
                length: i - startIndex,
                type: 'filter',
                keyword: 'keyword',
                args: quotedString,
                quoted: true,
            };
        } else if ((match = extract(negation)) !== undefined) {
            yield { startIndex, length: i - startIndex, type: 'not' };
        } else if ((match = extract(booleanKeywords)) !== undefined) {
            yield { startIndex, length: i - startIndex, type: match.trim() as NoArgTokenType };
        } else if ((match = extract(commentRegex)) !== undefined) {
            yield {
                startIndex,
                length: i - startIndex,
                type: 'comment',
                content: match.trim(),
            };
        } else if ((match = extract(filterName)) !== undefined) {
            const keyword = match.slice(0, match.length - 1);
            const nextChar = query[i];

            let args = '';
            let quoted = false;

            if (nextChar === '"' || nextChar === "'") {
                quoted = true;
                args = consumeString(nextChar);
            } else if ((match = extract(filterArgs)) !== undefined) {
                args = match;
            } else {
                throw new Error(`missing keyword arguments for ${keyword} at ${startIndex}`);
            }

            yield {
                startIndex,
                length: i - startIndex,
                type: 'filter',
                keyword,
                args,
                quoted,
            };
        } else if ((match = extract(bareWords)) !== undefined) {
            yield {
                startIndex,
                length: i - startIndex,
                type: 'filter',
                keyword: 'keyword',
                args: match,
            };
        } else if ((match = extract(whitespace)) !== undefined) {
            if (startIndex !== 0 && i !== query.length) {
                yield { startIndex, length: i - startIndex, type: 'implicit_and' };
            }
        } else {
            throw new Error(`unrecognized tokens at ${i}`);
        }

        if (startIndex === i) {
            throw new Error('bug: forgot to consume characters');
        }
    }
}
