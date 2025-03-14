import ServiceLocator from "../../ServiceLocator";
import Logger from "../../Services/Logging/Logger";
import { BadRequest } from "@curveball/http-errors";
import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { Score } from '@equal-vote/star-vote-shared/domain_model/Score';
import { expectPermission } from "../controllerUtils";
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { VotingMethods } from '../../Tabulators/VotingMethodSelecter';
import { IElectionRequest } from "../../IRequest";
import { Response, NextFunction } from 'express';
import { ballot, ElectionResults } from "@equal-vote/star-vote-shared/domain_model/ITabulators";
var seedrandom = require('seedrandom');

const BallotModel = ServiceLocator.ballotsDb();

const getElectionResults = async (req: IElectionRequest, res: Response, next: NextFunction) => {
    var electionId = req.election.election_id;
    Logger.info(req, `getElectionResults: ${electionId}`);

    if (!req.election.settings.public_results) {
        expectPermission(req.user_auth.roles, permissions.canViewPreliminaryResults)
    }

    const ballots = await BallotModel.getBallotsByElectionID(String(electionId), req);
    if (!ballots) {
        const msg = `Ballots not found for Election ${electionId}`;
        Logger.info(req, msg);
        throw new BadRequest(msg);
    }

    const election = req.election
    let results: ElectionResults[] = []
    for (let race_index = 0; race_index < election.races.length; race_index++) {
        const candidateNames = election.races[race_index].candidates.map((Candidate: any) => (Candidate.candidate_name))
        const race_id = election.races[race_index].race_id
        const cvr: ballot[] = []
        const num_winners = election.races[race_index].num_winners
        const voting_method = election.races[race_index].voting_method
        ballots.forEach((ballot: Ballot) => {
            const vote = ballot.votes.find((vote) => vote.race_id === race_id)
            if (vote) {
                let row: ballot = vote.scores.map((score: Score) => (
                    score.score
                ))
                // Feels hacky to add overrank information as an additional column
                // but the other alternatives required updating the voting method inputs 
                // and that would need refactors to all methods
                if(voting_method == 'IRV' || voting_method == 'STV'){
                    row = [...row, vote.overvote_rank ?? null];
                }
                cvr.push(row)
            }
        })

        if (!VotingMethods[voting_method]) {
            throw new Error(`Invalid Voting Method: ${voting_method}`)
        }
        const msg = `Tabulating results for ${voting_method} election`
        Logger.info(req, msg);
        let rng = seedrandom(election.election_id + ballots.length.toString())
        const tieBreakOrders = election.races[race_index].candidates.map((Candidate) => (rng() as number))
        results[race_index] = {
            votingMethod: voting_method,
            ...VotingMethods[voting_method](candidateNames, cvr, num_winners, tieBreakOrders, election.settings)
        }
    }
    
    res.json(
        {
            election: election,
            results: results
        }
    )
}

export {
    getElectionResults
}
