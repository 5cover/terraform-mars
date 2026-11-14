export interface Section {
  id: string;
  heading: string;
  content: string;
}

export type NumberStyle = 'roman' | 'arab' | 'latin';

export type Composition =
  | string
  | Section
  | Composition[]
  | {
      number?: NumberStyle | null;
      prefix?: string;
      children: Composition;
    };

export declare function compose(composition: Composition): string;
