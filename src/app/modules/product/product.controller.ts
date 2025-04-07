import { Request, Response } from 'express'
import { ProductServices } from './product.service'
import ProductValidationSchema from './product.validation'
import config from '../../config'
import { ZodError } from 'zod'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'

const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData = req.body

    // data validation by Zod
    const zodParsedData = ProductValidationSchema.parse(productData)

    const result = await ProductServices.createProductIntoDB(zodParsedData)

    // success response
    res.status(201).json({
      message: 'Product created successfully',
      success: true,
      data: result,
    })
  } catch (err: any) {
    // handle zod validation error
    if (err instanceof ZodError) {
      res.status(400).json({
        message: 'Validation failed',
        success: false,
        error: {
          name: 'ValidationError',
          errors: err.errors || null,
        },
        stack: config.node_env === 'development' ? err.stack : undefined,
      })
      return
    }

    // general error response
    res.status(500).json({
      message: err.message || 'Internal server error',
      success: false,
      error: err,
      stack: config.node_env === 'development' ? err.stack : undefined,
    })
  }
}

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await ProductServices.getAllProductsFromDB()
  sendResponse(res, {
    success: true,
    message: 'Products retrieved successfully',
    statusCode: 200,
    data: products,
  })
})

const getSingleProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId

    const result = await ProductServices.getSingleProductFromDB(productId)

    // not found error response
    if (!result) {
      res.status(404).json({
        message: 'Product not found',
        status: false,
        data: null,
      })
      return
    }

    // success response
    res.status(200).json({
      message: 'Product retrieved successfully',
      status: true,
      data: result,
    })

    // general error response
  } catch (err: any) {
    res.status(500).json({
      message: err.message || 'Internal server error',
      status: false,
      error: err,
      stack: config.node_env === 'development' ? err.stack : undefined,
    })
  }
}

const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId
    const updatedData = req.body
    const result = await ProductServices.updateProductInDB(
      productId,
      updatedData,
    )

    // not found error response
    if (!result) {
      res.status(404).json({
        message: 'Product not fond',
        status: false,
        data: null,
      })
      return
    }

    // success response
    res.status(200).json({
      message: 'Product updated successfully',
      status: true,
      data: result,
    })
  } catch (err: any) {
    // general error response
    res.status(500).json({
      message: err.message || 'Internal server error',
      status: false,
      error: err,
      stack: config.node_env === 'development' ? err.stack : undefined,
    })
  }
}

const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = req.params.productId

    const result = await ProductServices.deleteProductFromDB(productId)

    // not found error response
    if (result.matchedCount === 0) {
      res.status(404).json({
        message: 'Product not found',
        status: false,
        data: null,
      })
      return
    }

    // success response
    res.status(200).json({
      message: 'Product deleted successfully',
      status: true,
      data: {},
    })
  } catch (err: any) {
    res.status(500).json({
      message: err.message || 'Internal server error',
      status: false,
      error: err,
      stack: config.node_env === 'development' ? err.stack : undefined,
    })
  }
}

export const ProductControllers = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
}
