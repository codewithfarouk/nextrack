// types.ts

export interface Role {
    id: number;
    name: string;
  }
  
  export interface User {
    id: number;
    name: string;
    email: string;
  }
  
  // Full backlog type returned by server
  export interface Backlog {
    id: string;
    title: string;
    content: any;
    moduleType: string;
    createdAt: string;
    updatedAt: string;
    roles: Role[];
    users: User[];
    creator: User;
  }
  
  // Local backlog saved in localStorage
  export interface LocalBacklog {
    id: string;
    name: string;
    createdAt: Date;
    data: any[];
    namespace: string;
    roles: Role[];
  }
  