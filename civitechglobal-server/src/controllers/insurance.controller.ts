import type { Request, Response, NextFunction } from 'express';
import * as insuranceService from '../services/insurance.service.js';
import * as insuranceRequestService from '../services/insurance-request.service.js';
import * as otpService from '../services/otp.service.js';
import { successResponse } from '../utils/apiResponse.js';

export async function getCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await insuranceService.getCatalog());
  } catch (error) {
    next(error);
  }
}

export async function getProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await insuranceService.getAllProducts());
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await insuranceService.getProductBySlug(req.params.slug as string));
  } catch (error) {
    next(error);
  }
}

export async function sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await otpService.requestCode(req.body.phone);
    successResponse(res, result, 'کد تأیید ارسال شد.');
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await otpService.verifyCode(req.body.phone, req.body.code);
    successResponse(res, result, 'شماره تماس تأیید شد.');
  } catch (error) {
    next(error);
  }
}

export async function submitRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await insuranceRequestService.submitRequest({
      productSlug: req.body.productSlug,
      phoneToken: req.body.phoneToken,
      answers: req.body.answers,
      email: req.body.email ?? null,
    });
    successResponse(res, result, 'درخواست شما با موفقیت ثبت شد.', 201);
  } catch (error) {
    next(error);
  }
}

export async function trackRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    successResponse(res, await insuranceRequestService.trackRequest(req.params.code as string));
  } catch (error) {
    next(error);
  }
}
