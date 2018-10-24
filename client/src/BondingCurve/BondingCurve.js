import cn from "classnames";
import PropTypes from 'prop-types';
import React from 'react';
import ErrorBoundary from 'react-error-boundary';
import { getWeb3 } from '../utils/getWeb3';
import styles from './BondingCurve.module.scss';
import BondingCurveChart from './components/charts/BondingCurve';
import Timeline from './components/charts/Timeline';
import ErrorComponent from './components/Error';
import Loader from './components/Loader';

import "react-vis/dist/style.css";
import { timeFormatDefaultLocale } from 'd3-time-format';
import english from 'd3-time-format/locale/en-US.json';

// To prevent overflowing of large month names
timeFormatDefaultLocale({
    ...english,
    months: english.shortMonths
});

export default class BondingCurve extends React.Component {

    static propTypes = {
        defaultTab: PropTypes.string,
        contractAddress: PropTypes.string.isRequired,
        contractArtifact: PropTypes.object.isRequired,
        height: PropTypes.number,
        onError: PropTypes.func,
        onLoaded: PropTypes.func,
    }

    static defaultProps = {
        height: 200,
        onLoaded: () => { },
    }

    state = {
        activeTab: this.props.defaultTab || 'timeline',
        error: false,
        web3: null,
        contract: null,
        loading: true
    }

    componentDidMount = async () => {
        try {
            await this.getContract(this.props);
        } catch (error) {
            this.setState({ error, loading: false })
        }
    };

    componentWillReceiveProps = async (nextProps) => {
        try {
            if (this.props.contractAddress !== nextProps.contractAddress) {
                await this.getContract(nextProps);
            }
        } catch (error) {
            this.setState({ error, loading: false })
        }
    };

    getContract = async (props) => {
        const { contractAddress, contractArtifact, onLoaded } = props;

        // Reset state
        this.setState({
            loading: true,
            contractAddress: null,
            contract: null,
            error: null
        })

        try {

            // Get network provider and web3 instance.
            const web3 = getWeb3();

            // Check if connected
            await web3.eth.net.isListening();

            if (!web3.utils.isAddress(contractAddress)) {
                this.setState({
                    loading: false,
                    error: "Invalid address"
                })
            } else {
                const contract = new web3.eth.Contract(contractArtifact.abi, contractAddress);

                const code = await web3.eth.getCode(contractAddress);

                if (code === "0x") {
                    this.setState({
                        loading: false,
                        error: "Invalid contract"
                    })
                } else {
                    onLoaded();

                    this.setState({ web3, contract, loading: false });
                }
            }
        } catch (error) {
            throw error;
        }
    }

    toggleTab(tabName) {
        this.setState({
            activeTab: tabName
        });
    }

    renderErrorComponent = (error) => {
        const { height, onError } = this.props;

        let message = error;
        let originalMessage = error;

        if (error.error || error.message) {
            originalMessage = error.message || error.error.message;
            console.error(error.message || error.error.message);
            message = "An error has occurred";
        } else {
            console.error(message)
        }

        if (onError) {
            onError(originalMessage);
            return null;
        }

        return (
            <ErrorComponent
                message={message}
                height={height} />
        )
    }

    render() {
        const { activeTab, web3, error, loading, contract } = this.state;
        const { contractAddress, height } = this.props;

        if (loading) return <Loader height={height} />;

        // Unable to load contract
        if (!loading && !web3 && !error) return null;

        const Tab = activeTab === 'timeline' ? Timeline : BondingCurveChart;

        return (

            <div className={styles.BondingModule}>
                <ul className={styles.Tabs}>
                    <li className={cn({ active: activeTab === 'timeline' })}>
                        <button onClick={this.toggleTab.bind(this, "timeline")}>Timeline</button>
                    </li>
                    <li className={cn({ active: activeTab === 'bonding-curve' })}>
                        <button onClick={this.toggleTab.bind(this, "bonding-curve")}>Bonding Curve</button>
                    </li>
                </ul>

                <ErrorBoundary
                    FallbackComponent={this.renderErrorComponent}>

                    {
                        error ? this.renderErrorComponent(error) : null
                    }

                    {
                        web3 && !error && contract && (
                            <div className={styles.Tab_content}>
                                <Tab
                                    key={activeTab}
                                    web3={web3}
                                    height={height}
                                    contractAddress={contractAddress}
                                    bondingCurveContract={contract}
                                />
                            </div>
                        )
                    }
                </ErrorBoundary>

            </div>
        );
    }
}