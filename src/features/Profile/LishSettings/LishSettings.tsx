import { compose, dec, lensPath, path, pathOr, remove, set } from 'ramda';
import * as React from 'react';
import { connect, MapDispatchToProps } from 'react-redux';
import ActionsPanel from 'src/components/ActionsPanel';
import AddNewLink from 'src/components/AddNewLink';
import Button from 'src/components/Button';
import FormControl from 'src/components/core/FormControl';
import FormHelperText from 'src/components/core/FormHelperText';
import InputLabel from 'src/components/core/InputLabel';
import Paper from 'src/components/core/Paper';
import {
  StyleRulesCallback,
  withStyles,
  WithStyles
} from 'src/components/core/styles';
import Typography from 'src/components/core/Typography';
import setDocs from 'src/components/DocsSidebar/setDocs';
import { DocumentTitleSegment } from 'src/components/DocumentTitle';
import MenuItem from 'src/components/MenuItem';
import Notice from 'src/components/Notice';
import Select from 'src/components/Select';
import TextField from 'src/components/TextField';
import { LISH } from 'src/documentation';
import { updateProfile } from 'src/services/profile';
import { handleUpdate } from 'src/store/profile/profile.actions';
import { MapState } from 'src/store/types';
import getAPIErrorFor from 'src/utilities/getAPIErrorFor';
import scrollErrorIntoView from 'src/utilities/scrollErrorIntoView';

type ClassNames =
  | 'root'
  | 'title'
  | 'intro'
  | 'modeControl'
  | 'sshWrap'
  | 'keyTextarea'
  | 'image'
  | 'addNew'
  | 'remove';

const styles: StyleRulesCallback<ClassNames> = theme => ({
  root: {
    padding: theme.spacing.unit * 3,
    paddingBottom: theme.spacing.unit * 3
  },
  title: {
    marginBottom: theme.spacing.unit * 2
  },
  intro: {
    marginBottom: theme.spacing.unit * 2
  },
  modeControl: {
    display: 'flex'
  },
  image: {
    display: 'flex',
    flexWrap: 'wrap'
  },
  addNew: {
    marginTop: theme.spacing.unit * 2
  },
  sshWrap: {
    margin: `${theme.spacing.unit}px 0`,
    [theme.breakpoints.up('md')]: {
      display: 'flex',
      alignItems: 'flex-end'
    }
  },
  keyTextarea: {
    [theme.breakpoints.up('md')]: {
      minWidth: 415
    }
  },
  remove: {
    margin: '8px 0 0 -26px',
    [theme.breakpoints.up('md')]: {
      margin: `0 0 ${theme.spacing.unit / 2}px 0`
    }
  }
});

interface State {
  submitting: boolean;
  errors?: Linode.ApiFieldError[];
  success?: string;
  lishAuthMethod?: string;
  authorizedKeys: string[];
  authorizedKeysCount: number;
}

type CombinedProps = StateProps & DispatchProps & WithStyles<ClassNames>;

class LishSettings extends React.Component<CombinedProps, State> {
  state: State = {
    submitting: false,
    lishAuthMethod: this.props.lishAuthMethod || 'password_keys',
    authorizedKeys: this.props.authorizedKeys || [],
    authorizedKeysCount: this.props.authorizedKeys
      ? this.props.authorizedKeys.length
      : 1
  };

  render() {
    const { classes, loading } = this.props;
    const {
      lishAuthMethod,
      authorizedKeys,
      authorizedKeysCount,
      success,
      errors
    } = this.state;
    const hasErrorFor = getAPIErrorFor(
      {
        lish_auth_method: 'authentication method',
        authorized_keys: 'ssh public keys'
      },
      errors
    );
    const generalError = hasErrorFor('none');
    const authMethodError = hasErrorFor('lish_auth_method');
    const authorizedKeysError = hasErrorFor('authorized_keys');

    return (
      <React.Fragment>
        <DocumentTitleSegment segment="Lish" />
        <Paper className={classes.root}>
          <Typography
            role="header"
            variant="h2"
            className={classes.title}
            data-qa-title
          >
            LISH
          </Typography>
          {success && <Notice success text={success} />}
          {authorizedKeysError && <Notice error text={authorizedKeysError} />}
          {generalError && <Notice error text={generalError} />}
          <Typography className={classes.intro}>
            This controls what authentication methods are allowed to connect to
            the Lish console servers.
          </Typography>
          {loading ? null : (
            <React.Fragment>
              <FormControl className={classes.modeControl}>
                <InputLabel
                  htmlFor="mode-select"
                  disableAnimation
                  shrink={true}
                >
                  Authentication Mode
                </InputLabel>
                <div>
                  <Select
                    inputProps={{ name: 'mode-select', id: 'mode-select' }}
                    value={lishAuthMethod}
                    onChange={this.onListAuthMethodChange}
                  >
                    <MenuItem value={'password_keys'}>
                      Allow both password and key authentication
                    </MenuItem>
                    <MenuItem value={'keys_only'}>
                      Allow key authentication only
                    </MenuItem>
                    <MenuItem value={'disabled'}>Disable Lish</MenuItem>
                  </Select>
                  {authMethodError && (
                    <FormHelperText error>{authMethodError}</FormHelperText>
                  )}
                </div>
              </FormControl>
              {Array.from(Array(authorizedKeysCount)).map((value, idx) => (
                <div className={classes.sshWrap} key={idx}>
                  <TextField
                    key={idx}
                    label="SSH Public Key"
                    onChange={this.onPublicKeyChange(idx)}
                    value={authorizedKeys[idx] || ''}
                    helperText="Place your SSH public keys here for use with Lish console access."
                    multiline
                    rows="4"
                    className={classes.keyTextarea}
                    data-qa-public-key
                  />
                  <Button
                    type="remove"
                    onClick={this.onPublicKeyRemove(idx)}
                    className={classes.remove}
                    data-qa-remove
                  />
                </div>
              ))}
              <AddNewLink
                onClick={this.addSSHPublicKeyField}
                label="Add SSH Public Key"
                left
                className={classes.addNew}
              />
            </React.Fragment>
          )}
          <ActionsPanel>
            <Button
              type="primary"
              onClick={this.onSubmit}
              loading={this.state.submitting}
              data-qa-save
            >
              Save
            </Button>
          </ActionsPanel>
        </Paper>
      </React.Fragment>
    );
  }

  static docs = [LISH];

  addSSHPublicKeyField = () =>
    this.setState({ authorizedKeysCount: this.state.authorizedKeysCount + 1 });

  onSubmit = () => {
    const { authorizedKeys, lishAuthMethod } = this.state;
    const { actions } = this.props;
    const keys = authorizedKeys.filter(v => v !== '');

    this.setState({ errors: undefined, submitting: true });

    updateProfile({
      lish_auth_method: lishAuthMethod,
      ...(lishAuthMethod !== 'disabled' && { authorized_keys: keys })
    })
      .then(profileData => {
        this.setState(
          {
            submitting: false,
            success: 'LISH authentication settings have been updated.',
            authorizedKeys: profileData.authorized_keys || [],
            authorizedKeysCount: profileData.authorized_keys
              ? profileData.authorized_keys.length
              : 1
          },
          () => actions.updateProfile(profileData)
        );
      })
      .catch(error => {
        const fallbackError = [{ reason: 'An unexpected error has occured.' }];
        this.setState(
          {
            submitting: false,
            errors: pathOr(
              fallbackError,
              ['response', 'data', 'errors'],
              error
            ),
            success: undefined
          },
          () => {
            scrollErrorIntoView();
          }
        );
      });
  };

  onListAuthMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    this.setState({ lishAuthMethod: e.target.value });

  onPublicKeyChange = (idx: number) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    this.setState(set(lensPath(['authorizedKeys', idx]), e.target.value));
  };

  onPublicKeyRemove = (idx: number) => (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    this.setState({
      authorizedKeys: remove(idx, 1, this.state.authorizedKeys),
      authorizedKeysCount: dec(this.state.authorizedKeysCount)
    });
  };
}

const styled = withStyles(styles);

interface StateProps {
  lishAuthMethod?: string;
  authorizedKeys?: string[];
  loading: boolean;
}

const mapStateToProps: MapState<StateProps, {}> = state => {
  const { profile } = state.__resources;
  return {
    loading: profile.loading,
    lishAuthMethod: path(['data', 'lish_auth_method'], profile),
    authorizedKeys: path(['data', 'authorized_keys'], profile)
  };
};

interface DispatchProps {
  actions: {
    updateProfile: (v: Linode.Profile) => void;
  };
}

const mapDispatchToProps: MapDispatchToProps<DispatchProps, {}> = dispatch => ({
  actions: {
    updateProfile: (v: Linode.Profile) => dispatch(handleUpdate(v))
  }
});

const connected = connect(
  mapStateToProps,
  mapDispatchToProps
);

const enhanced = compose(
  styled,
  connected,
  setDocs(LishSettings.docs)
);

export default enhanced(LishSettings);
