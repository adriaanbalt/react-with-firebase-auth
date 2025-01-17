import * as React from 'react';
import * as firebase from 'firebase';

import getErrorMessageForProvider from './getErrorMessageForProvider';

export type WrappedComponentProps = {
  signInWithEmailAndPassword: (email: string, password: string) => void;
  createUserWithEmailAndPassword: (email: string, password: string) => void;
  signInWithGoogle: () => void;
  signInWithFacebook: () => void;
  signInWithGithub: () => void;
  signInWithTwitter: () => void;
  signInWithPhoneNumber:  (phoneNumber: string, applicationVerifier: firebase.auth.ApplicationVerifier) => Promise<any>;
  signInAnonymously: () => void;
  signOut: () => void;
  setError: (error: any) => void;
  user?: firebase.User;
  error?: firebase.FirebaseError;
};

export type PossibleProviders =
  'googleProvider'
  | 'facebookProvider'
  | 'twitterProvider'
  | 'githubProvider';

export type ProvidersMapper = {
  googleProvider?: firebase.auth.GithubAuthProvider_Instance;
  facebookProvider?: firebase.auth.FacebookAuthProvider_Instance;
  twitterProvider?: firebase.auth.TwitterAuthProvider_Instance;
  githubProvider?:  firebase.auth.GithubAuthProvider_Instance;
};

export type HocParameters = {
  firebaseAppAuth: firebase.auth.Auth;
  providers?: ProvidersMapper;
};

export type FirebaseAuthProviderState = {
  user?: firebase.User,
  error?: string,
};

const withFirebaseAuth = ({
  firebaseAppAuth,
  providers = {},
}: HocParameters) =>
  (WrappedComponent: React.SFC<WrappedComponentProps>) =>
    class FirebaseAuthProvider extends React.PureComponent<{}, FirebaseAuthProviderState> {
      static displayName = `withFirebaseAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

      state = {
        user: undefined,
        error: undefined,
      };

      unsubscribeAuthStateListener: firebase.Unsubscribe;

      componentDidMount() {
        this.unsubscribeAuthStateListener =
          firebaseAppAuth.onAuthStateChanged((user: firebase.User) =>
            this.setState({ user })
          );
      }

      componentWillUnmount() {
        this.unsubscribeAuthStateListener();
      }

      setError = (error: any) => this.setState({ error });

      async tryTo <T> (operation: () => Promise<T>): Promise<T> {
        try {
          return operation();
        } catch(error) {
          this.setError(error.message);
          return error;
        }
      };

      tryToSignInWithProvider = (provider: PossibleProviders): Promise<firebase.auth.UserCredential> =>
        this.tryTo<firebase.auth.UserCredential>(() => {
          const providerInstance = providers[provider];

          if (!providerInstance) {
            throw new Error(getErrorMessageForProvider(provider));
          }

          return firebaseAppAuth.signInWithPopup(providerInstance);
        });

      signOut = () =>
        this.tryTo<void>(() => firebaseAppAuth.signOut());

      signInAnonymously = () =>
        this.tryTo<firebase.auth.UserCredential>(() => firebaseAppAuth.signInAnonymously());

      signInWithGithub = () =>
        this.tryToSignInWithProvider('githubProvider');

      signInWithTwitter = () =>
        this.tryToSignInWithProvider('twitterProvider');

      signInWithGoogle = () =>
        this.tryToSignInWithProvider('googleProvider');

      signInWithFacebook = () =>
        this.tryToSignInWithProvider('facebookProvider');

      signInWithEmailAndPassword = (email: string, password: string) =>
        this.tryTo<firebase.auth.UserCredential>(() => firebaseAppAuth.signInWithEmailAndPassword(email, password));

      signInWithPhoneNumber = (phoneNumber: string, applicationVerifier: firebase.auth.ApplicationVerifier) =>
        this.tryTo<firebase.auth.ConfirmationResult>(() => firebaseAppAuth.signInWithPhoneNumber(phoneNumber, applicationVerifier))

      createUserWithEmailAndPassword = (email: string, password: string) =>
        this.tryTo<firebase.auth.UserCredential>(() => firebaseAppAuth.createUserWithEmailAndPassword(email, password));

      sharedHandlers = {
        signInWithEmailAndPassword: this.signInWithEmailAndPassword,
        createUserWithEmailAndPassword: this.createUserWithEmailAndPassword,
        signInWithGithub: this.signInWithGithub,
        signInWithTwitter: this.signInWithTwitter,
        signInWithGoogle: this.signInWithGoogle,
        signInWithFacebook: this.signInWithFacebook,
        signInWithPhoneNumber: this.signInWithPhoneNumber,
        setError: this.setError,
        signInAnonymously: this.signInAnonymously,
        signOut: this.signOut,
      };

      render() {
        const props = {
          ...this.props,
          ...this.sharedHandlers,
          user: this.state.user,
          error: this.state.error,
        };

        return <WrappedComponent {...props} />;
      }
    }

export default withFirebaseAuth;
