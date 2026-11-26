// A Server Action used from a form: it receives the form's fields. The real page passes the real actions;
// the design preview passes harmless demo ones.
export type FormAction = (formData: FormData) => Promise<void>;

export type ConnectActions = {
  chooseRepo: FormAction;
  chooseProject: FormAction;
  disconnect: FormAction;
  // "Index my code": starts reading the repo and building the search index.
  startIndex: FormAction;
};
