export declare const saveHistory: (
  title: string,
  novelContent: string,
  yamlContent: string,
  analysisData: any
) => Promise<any>;

export declare const getHistoryList: (limit?: number) => Promise<any>;

export declare const getHistoryDetail: (id: number) => Promise<any>;

export declare const deleteHistory: (id: number) => Promise<any>;